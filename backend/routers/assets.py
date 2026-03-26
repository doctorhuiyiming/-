import asyncio
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Asset, GenerationTask, Project, Slice
from schemas import AssetResponse, AssetUpdate
from services.mock_ai import simulate_generation
from services.sse_manager import sse_manager

router = APIRouter(prefix="/api/v1", tags=["assets"])


@router.get("/projects/{project_id}/assets", response_model=List[AssetResponse])
def list_assets(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    assets = db.query(Asset).filter(Asset.project_id == project_id).all()
    return assets


@router.patch("/assets/{asset_id}", response_model=AssetResponse)
def update_asset(asset_id: str, payload: AssetUpdate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if payload.new_name is not None:
        asset.new_name = payload.new_name
    if payload.new_description is not None:
        asset.new_description = payload.new_description
    if payload.new_image_url is not None:
        asset.new_image_url = payload.new_image_url
    if payload.is_confirmed is not None:
        asset.is_confirmed = payload.is_confirmed

    db.commit()
    db.refresh(asset)
    return asset


@router.post("/projects/{project_id}/confirm-assets")
async def confirm_assets(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Mark all assets as confirmed
    assets = db.query(Asset).filter(Asset.project_id == project_id).all()
    for asset in assets:
        asset.is_confirmed = True

    # Update project status to 生成中
    project.status = "生成中"
    project.updated_at = datetime.utcnow()
    db.commit()

    # Get all pending slices and create generation tasks for each
    slices = db.query(Slice).filter(
        Slice.project_id == project_id,
        Slice.status == "pending",
    ).all()

    task_ids = []
    for slice_obj in slices:
        slice_obj.status = "generating"
        slice_obj.updated_at = datetime.utcnow()

        prompt = slice_obj.prompt or slice_obj.original_description
        task = GenerationTask(
            id=str(uuid.uuid4()),
            slice_id=slice_obj.id,
            project_id=project_id,
            prompt=prompt,
            status="queued",
            created_at=datetime.utcnow(),
        )
        db.add(task)
        db.flush()
        task_ids.append(task.id)

    db.commit()

    # Fire off background simulation for each task
    for task_id in task_ids:
        asyncio.create_task(simulate_generation(task_id, sse_manager))

    await sse_manager.publish(
        project_id,
        "generation_started",
        {
            "project_id": project_id,
            "status": "生成中",
            "task_count": len(task_ids),
        },
    )

    return {
        "message": "Assets confirmed, generation started",
        "project_id": project_id,
        "tasks_created": len(task_ids),
    }
