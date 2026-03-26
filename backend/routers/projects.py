import asyncio
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Project, Slice
from schemas import ProjectCreate, ProjectResponse, ProjectUpdate
from services.mock_ai import simulate_parsing
from services.sse_manager import sse_manager

router = APIRouter(prefix="/api/v1", tags=["projects"])


def build_project_response(project: Project, db: Session) -> ProjectResponse:
    slices = db.query(Slice).filter(Slice.project_id == project.id).all()
    slice_count = len(slices)
    completed_count = sum(1 for s in slices if s.status == "completed")
    failed_count = sum(1 for s in slices if s.status == "failed")

    resp = ProjectResponse(
        id=project.id,
        title=project.title,
        original_language=project.original_language,
        target_region=project.target_region,
        extract_method=project.extract_method,
        has_character_recognition=project.has_character_recognition,
        status=project.status,
        notes=project.notes,
        episode_count=project.episode_count,
        created_at=project.created_at,
        updated_at=project.updated_at,
        slice_count=slice_count,
        completed_count=completed_count,
        failed_count=failed_count,
    )
    return resp


@router.get("/projects", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return [build_project_response(p, db) for p in projects]


@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        id=str(uuid.uuid4()),
        title=payload.title,
        original_language=payload.original_language,
        target_region=payload.target_region,
        extract_method=payload.extract_method,
        has_character_recognition=payload.has_character_recognition,
        notes=payload.notes,
        status="解析中",
        episode_count=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Kick off background parsing simulation
    asyncio.create_task(simulate_parsing(project.id, sse_manager))

    return build_project_response(project, db)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return build_project_response(project, db)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.title is not None:
        project.title = payload.title
    if payload.notes is not None:
        project.notes = payload.notes
    if payload.target_region is not None:
        project.target_region = payload.target_region
    if payload.status is not None:
        project.status = payload.status

    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return build_project_response(project, db)


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return None
