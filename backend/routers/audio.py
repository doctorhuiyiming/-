from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import AudioTrack, Project
from schemas import AudioTrackResponse, AudioTrackUpdate

router = APIRouter(prefix="/api/v1", tags=["audio"])


@router.get("/projects/{project_id}/audio-tracks", response_model=List[AudioTrackResponse])
def list_audio_tracks(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tracks = db.query(AudioTrack).filter(AudioTrack.project_id == project_id).all()
    return tracks


@router.patch("/audio-tracks/{track_id}", response_model=AudioTrackResponse)
def update_audio_track(track_id: str, payload: AudioTrackUpdate, db: Session = Depends(get_db)):
    track = db.query(AudioTrack).filter(AudioTrack.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Audio track not found")

    if payload.offset_ms is not None:
        track.offset_ms = payload.offset_ms
    if payload.is_muted is not None:
        track.is_muted = payload.is_muted
    if payload.label is not None:
        track.label = payload.label
    if payload.asset_url is not None:
        track.asset_url = payload.asset_url

    db.commit()
    db.refresh(track)
    return track
