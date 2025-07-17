import asyncio
import queue
import re
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Final

import ollama

from eda.utils import PROMPTS_PATH

_DEFAULT_MODEL = "mistral:latest"

_ANNOTATED_TRANSLATION_PATTERN = re.compile(r"[\[(].+[\])]$")

_translate_prompt: Final = PROMPTS_PATH.joinpath("translate.txt").read_text()
_client: Final = ollama.Client()


def translate_llm(text: str, model_name: str = _DEFAULT_MODEL) -> str:
    response = _client.chat(
        model_name, messages=PromptedMessages.create_single(_translate_prompt, text)
    )
    translated = response.message.content
    assert translated is not None
    translated = _ANNOTATED_TRANSLATION_PATTERN.sub("", translated).strip()
    return translated


@dataclass(kw_only=True)
class PromptedMessages:
    prompt: str
    model_inputs: list[str]

    def create(self) -> list[list[ollama.Message]]:
        return [
            self.create_single(self.prompt, content) for content in self.model_inputs
        ]

    @classmethod
    def create_single(cls, prompt: str, content: str) -> list[ollama.Message]:
        return [
            ollama.Message(role="system", content=prompt),
            ollama.Message(role="user", content=content),
        ]


class ModelResponseGenerator:
    def __init__(self, model_name: str = _DEFAULT_MODEL):
        self._model_name = model_name
        self._client = ollama.AsyncClient()
        self._responses: queue.Queue[str] = queue.Queue()

    async def generate_responses(
        self, prompted_messages: PromptedMessages
    ) -> list[str]:
        messages = prompted_messages.create()
        async with asyncio.TaskGroup() as task_group:
            for message_pair in messages:
                task_group.create_task(self._worker(message_pair))

        responses = []
        while not self._responses.empty():
            response = self._responses.get()
            responses.append(response)
        return responses

    async def _worker(self, messages: Sequence[ollama.Message]):
        response = await self._client.chat(self._model_name, messages)
        content = response.message.content
        assert content is not None
        self._responses.put(content)


generate_responses = ModelResponseGenerator().generate_responses
