"""Farms CRUD endpoints."""

from fastapi import APIRouter, BackgroundTasks, Depends, status

from ..auth import get_current_user_id
from ..schemas import AnalysisStatusResponse, CreateFarmRequest, Farm
from ..services import farms_repo
from ..services.pipeline import (
    run_full_pipeline,
    run_recommendations,
    run_weather_analysis,
)

router = APIRouter(prefix="/farms", tags=["farms"])


@router.post("", response_model=Farm, status_code=status.HTTP_201_CREATED)
def create_farm(
    request: CreateFarmRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
) -> Farm:
    farm = farms_repo.create_farm(user_id, request)
    background_tasks.add_task(run_full_pipeline, user_id, farm.id)
    return farm


@router.get("", response_model=list[Farm])
def list_farms(user_id: str = Depends(get_current_user_id)) -> list[Farm]:
    return farms_repo.list_farms(user_id)


@router.get("/{farm_id}", response_model=Farm)
def get_farm(
    farm_id: str,
    user_id: str = Depends(get_current_user_id),
) -> Farm:
    return farms_repo.get_farm(user_id, farm_id)


@router.delete("/{farm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farm(
    farm_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    farms_repo.delete_farm(user_id, farm_id)



@router.get("/{farm_id}/analysis-status", response_model=AnalysisStatusResponse)
def analysis_status(
    farm_id: str,
    user_id: str = Depends(get_current_user_id),
) -> AnalysisStatusResponse:
    farm = farms_repo.get_farm(user_id, farm_id)
    return AnalysisStatusResponse(
        farm_id=farm.id,
        weather_analysis=farm.weather_analysis,
        recommendations=farm.recommendations,
    )


@router.post("/{farm_id}/retry-weather", response_model=Farm)
def retry_weather(
    farm_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
) -> Farm:
    # Reset status so the pipeline reruns even if currently 'completed' or 'failed'.
    farms_repo.update_farm_fields(
        user_id, farm_id, {"weather_analysis": {"status": "pending"}}
    )
    background_tasks.add_task(run_weather_analysis, user_id, farm_id)
    return farms_repo.get_farm(user_id, farm_id)


@router.post("/{farm_id}/retry-recommendations", response_model=Farm)
def retry_recommendations(
    farm_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
) -> Farm:
    farms_repo.update_farm_fields(
        user_id, farm_id, {"recommendations": {"status": "pending"}}
    )
    background_tasks.add_task(run_recommendations, user_id, farm_id)
    return farms_repo.get_farm(user_id, farm_id)