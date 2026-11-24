"""EXIF orientation handling in the acne model's preprocessing."""
import pytest
from PIL import Image

torch = pytest.importorskip("torch")
pytest.importorskip("torchvision")

from services import inference  # noqa: E402

EXIF_ORIENTATION = 0x0112


def _gradient(width: int, height: int) -> Image.Image:
    img = Image.new("RGB", (width, height))
    img.putdata([(x * 255 // width, y * 255 // height, 90) for y in range(height) for x in range(width)])
    return img


def test_images_without_orientation_tag_are_unchanged(tmp_path):
    path = tmp_path / "plain.png"
    original = _gradient(120, 80)
    original.save(path)

    loaded = inference._load_upright_rgb(path)
    assert loaded.size == original.size
    assert list(loaded.getdata()) == list(original.getdata())


def test_rotated_phone_photo_is_turned_upright(tmp_path):
    upright = _gradient(80, 120)
    stored_sideways = upright.transpose(Image.Transpose.ROTATE_90)
    exif = Image.Exif()
    exif[EXIF_ORIENTATION] = 6
    path = tmp_path / "phone.jpg"
    stored_sideways.save(path, exif=exif, quality=100)

    loaded = inference._load_upright_rgb(path)
    assert loaded.size == upright.size


def test_preprocess_output_shape(tmp_path):
    path = tmp_path / "face.png"
    _gradient(300, 200).save(path)
    tensor = inference._preprocess(path)
    assert tuple(tensor.shape) == (1, 3, 224, 224)
