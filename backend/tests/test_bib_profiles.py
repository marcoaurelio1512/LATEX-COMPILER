from __future__ import annotations

from pathlib import Path

from app.services.bib_profiles import (
    convert_bib_file,
    format_bibliography,
    parse_bib_text,
)
from app.services.md_to_bib import convert_markdown_to_bib


SAMPLE = """
@article{silva2020,
  author = {Silva, Maria},
  title = {Teste},
  journal = {Revista X},
  year = {2020},
  url = {https://exemplo.org},
}
"""


def test_parse_and_profiles():
    entries = parse_bib_text(SAMPLE)
    assert len(entries) == 1
    bl = format_bibliography(entries, "biblatex")
    assert "journaltitle" in bl
    assert "date" in bl
    bt = format_bibliography(entries, "bibtex")
    assert "journal =" in bt
    assert "journaltitle" not in bt
    ab = format_bibliography(entries, "abnt")
    assert "Disponível" in ab or "ABNT" in ab


def test_convert_bib_file(tmp_path: Path):
    src = tmp_path / "refs.bib"
    src.write_text(SAMPLE, encoding="utf-8")
    out = tmp_path / "refs-biblatex.bib"
    rel, n, keys = convert_bib_file(
        tmp_path, source=src, output=out, profile="biblatex"
    )
    assert n == 1
    assert "silva2020" in keys
    assert "journaltitle" in out.read_text(encoding="utf-8")


def test_md_to_bib_profile(tmp_path: Path):
    md = "# T\n[@silva2020]\n## Referências\n- Silva, Maria (2020). Titulo. Editora."
    out = tmp_path / "out.bib"
    result = convert_markdown_to_bib(
        tmp_path, markdown=md, output=out, append=False, profile="bibtex"
    )
    text = out.read_text(encoding="utf-8")
    assert result.profile == "bibtex"
    assert "silva2020" in text
    assert "BibTeX clássico" in text
