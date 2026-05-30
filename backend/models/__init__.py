from typing import Annotated, Any
from bson import ObjectId
from pydantic import BeforeValidator, PlainSerializer

# Custom type for handling MongoDB ObjectIds in Pydantic v2
PyObjectId = Annotated[
    str,
    BeforeValidator(lambda x: str(x) if isinstance(x, ObjectId) else x),
    PlainSerializer(lambda x: str(x), return_type=str),
]
