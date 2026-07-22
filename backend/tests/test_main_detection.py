from __future__ import annotations

from pathlib import Path

from app.services.main_detection import choose_main_file, detect_main


def test_priority_main_tex(tmp_path: Path):
    (tmp_path / "article.tex").write_text(
        "\\documentclass{article}\\begin{document}a\\end{document}",
        encoding="utf-8",
    )
    (tmp_path / "main.tex").write_text(
        "\\documentclass{article}\\begin{document}b\\end{document}",
        encoding="utf-8",
    )
    main, candidates = detect_main(tmp_path)
    assert main == "main.tex"
    assert "article.tex" in candidates


def test_configured_wins(tmp_path: Path):
    (tmp_path / "main.tex").write_text(
        "\\documentclass{article}\\begin{document}b\\end{document}",
        encoding="utf-8",
    )
    (tmp_path / "book.tex").write_text(
        "\\documentclass{book}\\begin{document}c\\end{document}",
        encoding="utf-8",
    )
    assert choose_main_file(["main.tex", "book.tex"], "book.tex") == "book.tex"
