import asyncio
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import GenerationTask, Project, Slice
from schemas import GenerationTaskResponse, GroupGenerateRequest, SliceResponse, SliceUpdate
from services.mock_ai import simulate_generation
from services.sse_manager import sse_manager

router = APIRouter(prefix="/api/v1", tags=["slices"])


def build_slice_response(slice_obj: Slice, db: Session) -> SliceResponse:
    tasks = db.query(GenerationTask).filter(
        GenerationTask.slice_id == slice_obj.id
    ).order_by(GenerationTask.created_at.desc()).all()

    return SliceResponse(
        id=slice_obj.id,
        project_id=slice_obj.project_id,
        slice_index=slice_obj.slice_index,
        time_start=slice_obj.time_start,
        time_end=slice_obj.time_end,
        original_description=slice_obj.original_description,
        original_dialogue=slice_obj.original_dialogue,
        ai_video_url=slice_obj.ai_video_url,
        ai_description=slice_obj.ai_description,
        prompt=slice_obj.prompt,
        status=slice_obj.status,
        vbench_score=slice_obj.vbench_score,
        adopted_task_id=slice_obj.adopted_task_id,
        error_message=slice_obj.error_message,
        created_at=slice_obj.created_at,
        updated_at=slice_obj.updated_at,
        tasks=tasks,
    )


@router.get("/projects/{project_id}/slices", response_model=List[SliceResponse])
def list_slices(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    slices = db.query(Slice).filter(Slice.project_id == project_id).order_by(Slice.slice_index).all()
    return [build_slice_response(s, db) for s in slices]


@router.patch("/slices/{slice_id}", response_model=SliceResponse)
def update_slice(slice_id: str, payload: SliceUpdate, db: Session = Depends(get_db)):
    slice_obj = db.query(Slice).filter(Slice.id == slice_id).first()
    if not slice_obj:
        raise HTTPException(status_code=404, detail="Slice not found")

    if payload.prompt is not None:
        slice_obj.prompt = payload.prompt
    if payload.original_description is not None:
        slice_obj.original_description = payload.original_description
    if payload.ai_description is not None:
        slice_obj.ai_description = payload.ai_description

    slice_obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(slice_obj)
    return build_slice_response(slice_obj, db)


@router.post("/video/generate/group")
async def group_generate(payload: GroupGenerateRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task_ids = []
    for slice_id in payload.slice_ids:
        slice_obj = db.query(Slice).filter(Slice.id == slice_id).first()
        if not slice_obj:
            continue

        # Use prompt_override if provided, otherwise fall back to slice's prompt
        prompt = payload.prompt_override or slice_obj.prompt or slice_obj.original_description

        slice_obj.status = "generating"
        slice_obj.error_message = None
        slice_obj.updated_at = datetime.utcnow()

        task = GenerationTask(
            id=str(uuid.uuid4()),
            slice_id=slice_obj.id,
            project_id=payload.project_id,
            prompt=prompt,
            status="queued",
            created_at=datetime.utcnow(),
        )
        db.add(task)
        db.flush()
        task_ids.append(task.id)

    # Make sure project is in 生成中 state
    if project.status not in ("生成中",):
        project.status = "生成中"
        project.updated_at = datetime.utcnow()

    db.commit()

    for task_id in task_ids:
        asyncio.create_task(simulate_generation(task_id, sse_manager))

    await sse_manager.publish(
        payload.project_id,
        "generation_started",
        {
            "project_id": payload.project_id,
            "slice_ids": payload.slice_ids,
            "task_count": len(task_ids),
        },
    )

    return {
        "message": "Batch generation started",
        "project_id": payload.project_id,
        "tasks_created": len(task_ids),
        "task_ids": task_ids,
    }


@router.get("/slices/{slice_id}/tasks", response_model=List[GenerationTaskResponse])
def list_slice_tasks(slice_id: str, db: Session = Depends(get_db)):
    slice_obj = db.query(Slice).filter(Slice.id == slice_id).first()
    if not slice_obj:
        raise HTTPException(status_code=404, detail="Slice not found")

    tasks = db.query(GenerationTask).filter(
        GenerationTask.slice_id == slice_id
    ).order_by(GenerationTask.created_at.desc()).all()
    return tasks


@router.post("/slices/{slice_id}/adopt/{task_id}", response_model=SliceResponse)
def adopt_task(slice_id: str, task_id: str, db: Session = Depends(get_db)):
    slice_obj = db.query(Slice).filter(Slice.id == slice_id).first()
    if not slice_obj:
        raise HTTPException(status_code=404, detail="Slice not found")

    task = db.query(GenerationTask).filter(
        GenerationTask.id == task_id,
        GenerationTask.slice_id == slice_id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found for this slice")

    if task.status != "completed":
        raise HTTPException(status_code=400, detail="Cannot adopt a task that is not completed")

    slice_obj.adopted_task_id = task_id
    slice_obj.ai_video_url = task.video_url
    slice_obj.vbench_score = task.vbench_score
    slice_obj.status = "completed"
    slice_obj.error_message = None
    slice_obj.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(slice_obj)
    return build_slice_response(slice_obj, db)
