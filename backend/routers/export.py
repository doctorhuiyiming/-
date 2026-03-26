import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Project, Slice
from schemas import ExportRequest, ExportResponse

router = APIRouter(prefix="/api/v1", tags=["export"])


@router.post("/project/export", response_model=ExportResponse)
async def export_project(payload: ExportRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Simulate export processing delay
    await asyncio.sleep(2)

    slices = db.query(Slice).filter(Slice.project_id == payload.project_id).all()
    completed_slices = [s for s in slices if s.status == "completed"]

    if not completed_slices:
        raise HTTPException(
            status_code=400,
            detail="No completed slices available for export"
        )

    export_id = str(uuid.uuid4())
    safe_title = project.title.replace(" ", "_").replace("/", "-")
    filename = f"{safe_title}_export_{export_id[:8]}.{payload.format}"

    # Estimate size: ~5MB per completed slice
    estimated_size_mb = round(len(completed_slices) * 5.2 + 1.0, 1)

    download_url = f"https://mock-cdn.drama-factory.dev/exports/{export_id}/{filename}"

    return ExportResponse(
        download_url=download_url,
        filename=filename,
        estimated_size_mb=estimated_size_mb,
    )
