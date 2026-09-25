from agentbridge_node import local_inference


def test_bitnet_inventory_and_runtime(tmp_path, monkeypatch):
    root = tmp_path / "BitNet"
    bin_dir = root / "build" / "bin" / "Release"
    model_dir = root / "models" / "BitNet-b1.58-2B-4T"
    bin_dir.mkdir(parents=True)
    model_dir.mkdir(parents=True)
    (bin_dir / "llama-cli.exe").write_bytes(b"x")
    (bin_dir / "llama-server.exe").write_bytes(b"x")
    model = model_dir / "ggml-model-i2_s.gguf"
    model.write_bytes(b"x")
    monkeypatch.setenv("QUILLGEIST_BITNET_HOME", str(root))
    runtime = local_inference._bitnet_runtime()
    assert runtime and runtime["ready"] is True
    rows = local_inference._bitnet_models()
    assert len(rows) == 1
    assert rows[0]["runtime"] == "bitnet.cpp"
    assert rows[0]["path"] == str(model)
