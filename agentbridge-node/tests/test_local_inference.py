from agentbridge_node import local_inference as li


def test_parse_size():
    assert li._parse_size("4.7 GB") == int(4.7 * 1024**3)
    assert li._parse_size("900 MB") == 900 * 1024**2
    assert li._parse_size("bad") == 0


def test_configured_model_dirs_dedupes(monkeypatch, tmp_path):
    monkeypatch.setenv("QUILLGEIST_MODEL_DIRS", str(tmp_path) + li.os.pathsep + str(tmp_path))
    rows = li.configured_model_dirs({"model_dirs": [str(tmp_path)]})
    assert rows.count(tmp_path.resolve()) == 1


def test_gguf_inventory(tmp_path):
    model = tmp_path / "tiny.gguf"
    model.write_bytes(b"x" * 2048)
    rows = li._gguf_models({"model_dirs": [str(tmp_path)]})
    assert rows[0]["runtime"] == "llama.cpp"
    assert rows[0]["size_bytes"] == 2048


def test_fit_states():
    mem = {"available_bytes": 16 * 1024**3}
    likely = li.estimate_fit(2 * 1024**3, context_tokens=2048, memory=mem, reserve_gib=2)
    assert likely["fit"] == "likely"
    no = li.estimate_fit(20 * 1024**3, context_tokens=4096, memory=mem, reserve_gib=2)
    assert no["fit"] == "no"


def test_benchmark_refuses_uninstalled(monkeypatch):
    monkeypatch.setattr(li, "model_inventory", lambda config=None: [])
    out = li.benchmark("missing")
    assert out == {"ok": False, "error": "installed_model_not_found", "model": "missing"}


def test_route_local_when_viable(monkeypatch):
    fake = {
        "memory": {"available_bytes": 16 * 1024**3},
        "models": [{"id": "ollama:test", "runtime": "ollama", "size_bytes": 2 * 1024**3}],
    }
    monkeypatch.setattr(li, "status", lambda config=None: fake)
    out = li.route_recommendation(prefer_local=True, context_tokens=2048)
    assert out["choice"]["target"] == "local"
    assert out["choice"]["model"] == "ollama:test"
