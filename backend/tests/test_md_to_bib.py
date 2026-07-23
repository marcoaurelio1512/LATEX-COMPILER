from __future__ import annotations

from pathlib import Path

from app.services.md_to_bib import convert_markdown_to_bib


def test_md_to_bib_from_citations_and_section(tmp_path: Path):
    md = """
# Capítulo

Texto com citação [@silva2020] e outra [REF:costa2019].

## Referências

- Silva, Maria (2020). Produção intelectual. Editora Alpha.
- [@costa2019] Costa, João (2019). Métodos de pesquisa. Editora Beta.
"""
    out = tmp_path / "referencias.bib"
    result = convert_markdown_to_bib(tmp_path, markdown=md, output=out, append=False)
    text = out.read_text(encoding="utf-8")
    assert result.entries_count >= 2
    assert "silva2020" in text
    assert "costa2019" in text
    assert "Produção intelectual" in text


def test_md_to_bib_stub_for_unknown_cite(tmp_path: Path):
    md = "Ver [@novaChave2024] no texto."
    out = tmp_path / "refs.bib"
    result = convert_markdown_to_bib(tmp_path, markdown=md, output=out, append=False)
    text = out.read_text(encoding="utf-8")
    assert "novaChave2024" in text
    assert "TODO" in text
    assert result.entries_count == 1
