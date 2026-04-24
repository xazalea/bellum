import typing
import traceback
import uuid
import random

import revTongYi.qianwen as qwen

from free_one_api.entities import request, response

from ...models import adapter
from ...models.adapter import llm
from ...entities import request, response, exceptions
from ...models.channel import evaluation


@adapter.llm_adapter
class QianWenAdapter(llm.LLMLibAdapter):
    
    @classmethod
    def name(cls) -> str:
        return "xw5xr6/revTongYi"
    
    @classmethod
    def description(self) -> str:
        return "Use leeeduke/revTongYi to access Aliyun TongYi QianWen."

    def supported_models(self) -> list[str]:
        return [
            "gpt-3.5-turbo",
            "gpt-4"
        ]

    def function_call_supported(self) -> bool:
        return False

    def stream_mode_supported(self) -> bool:
        return True

    def multi_round_supported(self) -> bool:
        return True
    
    @classmethod
    def config_comment(cls) -> str:
        return \
"""RevTongYi use cookies that can be extracted from https://qianwen.aliyun.com/
You should provide cookie string as `cookie` in config:
{
    "cookie": "your cookie string"
}

Method of getting cookie string, please refer to https://github.com/leeeduke/revTongYi
"""

    @classmethod
    def supported_path(cls) -> str:
        return "/v1/chat/completions"
    
    chatbot: qwen.Chatbot
    
    def __init__(self, config: dict, eval: evaluation.AbsChannelEvaluation):
        self.config = config
        self.eval = eval
        self.chatbot = qwen.Chatbot(
            cookies_str=config['cookie']
        )
        
    async def test(self) -> typing.Union[bool, str]:
        try:
            # self.chatbot.create_session("Hello, reply 'hi' only.")
            self.chatbot.sessionId = ""
            resp = self.chatbot.ask(
                "Hello, reply 'hi' only.",
                sessionId=""
            )
            
            self.chatbot.delete_session(resp.sessionId)
            
            return True, ""
        except Exception as e:
            traceback.print_exc()
            return False, str(e)
        
    async def query(self, req: request.Request) -> typing.AsyncGenerator[response.Response, None]:
        prompt = ""
        
        for msg in req.messages:
            prompt += f"{msg['role']}: {msg['content']}\n"
        
        prompt += "assistant: "
        
        random_int = random.randint(0, 1000000000)
        
        prev_text = ""

        sessionId = ""

        self.chatbot.sessionId = ""
        
        for resp in self.chatbot.ask(
            prompt=prompt,
            sessionId="",
            stream=True,
        ):
            if resp.contents == None or len(resp.contents) == 0:
                continue

            sessionId = resp.sessionId
            
            yield response.Response(
                id=random_int,
                finish_reason=response.FinishReason.NULL,
                normal_message=resp.contents[0].content.replace(prev_text, ""),
                function_call=None
            )
            prev_text = resp.contents[0].content
        
        self.chatbot.delete_session(sessionId)
        
        yield response.Response(
            id=random_int,
            finish_reason=response.FinishReason.STOP,
            normal_message="",
            function_call=None
        )
