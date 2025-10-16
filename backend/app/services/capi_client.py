import asyncio
from typing import Any, Dict, List, Tuple

import httpx

from ..config import settings


class CapiClient:
    def __init__(self, access_token: str, graph_api_version: str = None) -> None:
        self.access_token = access_token or settings.meta_access_token
        self.graph_api_version = graph_api_version or settings.graph_api_version
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(60.0))

    async def close(self) -> None:
        await self._client.aclose()

    async def send_batch(self, dataset_id: str, events: List[Dict[str, Any]], upload_tag: str | None = None) -> Tuple[bool, Dict[str, Any]]:
        version = self.graph_api_version
        url = f"https://graph.facebook.com/{version}/{dataset_id}/events"
        params = {"access_token": self.access_token}
        payload: Dict[str, Any] = {"data": events}
        if upload_tag:
            payload["upload_tag"] = upload_tag

        retries = settings.max_retries
        backoff = settings.retry_backoff_base
        for attempt in range(retries + 1):
            try:
                resp = await self._client.post(url, params=params, json=payload)
                # Success codes are 200-range
                if 200 <= resp.status_code < 300:
                    return True, resp.json()
                # Retry on 429 and 5xx
                if resp.status_code in (429,) or 500 <= resp.status_code < 600:
                    if attempt < retries:
                        await asyncio.sleep(backoff)
                        backoff *= 2
                        continue
                # Non-retryable error
                return False, {"status_code": resp.status_code, "body": resp.text}
            except httpx.RequestError as exc:
                if attempt < retries:
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    continue
                return False, {"exception": str(exc)}


async def send_events_in_batches(dataset_id: str, events: List[Dict[str, Any]], upload_tag: str | None = None) -> List[Tuple[bool, Dict[str, Any]]]:
    client = CapiClient(access_token=settings.meta_access_token)
    results: List[Tuple[bool, Dict[str, Any]]] = []
    try:
        batch_size = settings.batch_size
        for i in range(0, len(events), batch_size):
            batch = events[i : i + batch_size]
            ok, info = await client.send_batch(dataset_id, batch, upload_tag=upload_tag)
            results.append((ok, info))
    finally:
        await client.close()
    return results


