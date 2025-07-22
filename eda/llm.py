import asyncio
import re
from dataclasses import dataclass
from typing import Any, Final, Optional

import ollama

from eda.utils import PROMPTS_PATH

_DEFAULT_MODEL = "mistral:latest"

_ANNOTATED_TRANSLATION_PATTERN = re.compile(r"[\[(].+[\])]$")

_translate_prompt: Final = PROMPTS_PATH.joinpath("translate.txt").read_text()
_client: Final = ollama.Client()


def translate_llm(text: str, model_name: str = _DEFAULT_MODEL) -> str:
    response = _client.chat(
        model_name, messages=MessageFactory(_translate_prompt).create_message(text).to_list()
    )
    translated = response.message.content
    assert translated is not None
    translated = _ANNOTATED_TRANSLATION_PATTERN.sub("", translated).strip()
    return translated

@dataclass
class ModelMessage:
    prompt: ollama.Message
    message: ollama.Message
    metadata: dict[str, Any]

    def to_list(self) -> list[ollama.Message]:
        return [self.prompt, self.message]

@dataclass
class MessageFactory:
    prompt: str

    def create_message(self, content: str, **kwargs: Any) -> ModelMessage:
        return ModelMessage(
            ollama.Message(role="system", content=self.prompt),
            ollama.Message(role="user", content=content),
            metadata=kwargs
        )

@dataclass
class ModelResponse:
    message: ModelMessage
    content: str
    metadata: dict[str, Any]

class ModelResponseGenerator:
    def __init__(self, task_group: asyncio.TaskGroup, model_name: str = _DEFAULT_MODEL, wait_time: float = 1.0):
        self._task_group = task_group
        self._model_name = model_name
        self._wait_time = wait_time
        self._client = ollama.AsyncClient()
        self._messages: asyncio.Queue[Optional[ModelMessage]] = asyncio.Queue()
        self._responses: asyncio.Queue[ModelResponse] = asyncio.Queue()

    @property
    def running(self) -> bool:
        return self._running

    @running.setter
    def running(self, value: bool):
        self._running = value

    async def poll_response(self) -> Optional[ModelResponse]:
        if self._responses.qsize() > 0:
            return await self._responses.get()
        else:
            return None

    async def wait(self):
        await asyncio.sleep(self._wait_time)

    async def run(self):
        while True:
            if (message := await self._messages.get()) is None:
                return
            self._task_group.create_task(self._worker(message))

    async def enqueue(self, item: Optional[ModelMessage | ModelResponse]):
        if item is None:
            await self._messages.put(None)
        elif isinstance(item, ModelResponse):
            await self._messages.put(item.message)
        else:
            await self._messages.put(item)

    async def _worker(self, message: ModelMessage):
        response = await self._client.chat(self._model_name, message.to_list())
        content = response.message.content
        assert content is not None
        await self._responses.put(
            ModelResponse(message, content, message.metadata)
        )
