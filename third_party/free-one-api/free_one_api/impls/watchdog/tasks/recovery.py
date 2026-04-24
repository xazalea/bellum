import asyncio

from ....models.watchdog import task
from ....models.channel import mgr as chanmgr
from ....entities import channel


class ChannelRecoveryTask(task.AbsTask):
    """Automatically recover disabled channels."""