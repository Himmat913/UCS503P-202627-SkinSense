from services.photo_validation import validate_photo, VALIDATOR_VERSION


def test_stub_always_passes():
    result = validate_photo(b"not a real image, the stub doesn't look")
    assert result["ok"] is True
    assert result["reasons"] == []


def test_stub_reports_its_own_version():
    result = validate_photo(b"")
    assert result["validator_version"] == VALIDATOR_VERSION
    assert result["validator_version"].startswith("stub-")


def test_stub_return_shape_matches_frozen_contract():
    result = validate_photo(b"x")
    assert set(result.keys()) == {"ok", "reasons", "checks", "validator_version"}
    assert isinstance(result["checks"], dict)