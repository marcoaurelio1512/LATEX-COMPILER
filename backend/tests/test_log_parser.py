from __future__ import annotations

from app.log_parser.parser import parse_latex_log, parse_with_meta


def test_undefined_control_sequence():
    log = """
! Undefined control sequence.
l.12 \\comandoInexistenteXYZ
"""
    diags = parse_latex_log(log)
    assert any(d.code == "UNDEFINED_CONTROL_SEQUENCE" for d in diags)
    assert any(d.line == 12 for d in diags)


def test_file_line_error():
    log = "capitulos/metodologia.tex:47: Undefined control sequence."
    diags = parse_latex_log(log)
    assert diags[0].file == "capitulos/metodologia.tex"
    assert diags[0].line == 47


def test_warning_overfull():
    log = r"Overfull \hbox (20.0pt too wide) in paragraph at lines 10--12"
    diags = parse_latex_log(log)
    assert diags[0].severity == "warning"
    assert diags[0].code == "OVERFULL_HBOX"


def test_timeout_meta():
    diags, errors, _ = parse_with_meta("", status="timeout")
    assert errors >= 1
    assert any(d.code == "TIMEOUT" for d in diags)


def test_file_line_error_flag_is_not_biber_error():
    log = (
        "Latexmk: applying rule 'pdflatex'\n"
        "Running 'pdflatex -interaction=nonstopmode -file-line-error "
        "-synctex=1 -no-shell-escape -recorder "
        '-output-directory=".latex-local/build" "main.tex"\'\n'
        "Output written on main.pdf (1 page).\n"
        "Latexmk: All targets (main.pdf) are up-to-date\n"
    )
    diags = parse_latex_log(log)
    assert not any(d.code == "BIBER_ERROR" for d in diags)
    assert not any(d.severity == "error" for d in diags)


def test_real_biber_error_still_detected():
    log = "ERROR - Cannot find 'refs.bib'!\n"
    diags = parse_latex_log(log)
    assert any(d.code == "BIBER_ERROR" for d in diags)


def test_transient_biblatex_warnings_ignored():
    log = """
Package biblatex Warning: Please (re)run Biber on the file:
Package biblatex Warning: Please rerun LaTeX.
LaTeX Warning: Label(s) may have changed. Rerun to get cross-references right.
Package epstopdf Warning: Shell escape feature is not enabled.
"""
    diags = parse_latex_log(log)
    assert diags == []


def test_real_undefined_citation_still_reported():
    log = "LaTeX Warning: Citation 'silva2020' on page 2 undefined on input line 126.\n"
    diags = parse_latex_log(log)
    assert any(d.code == "CITATION_UNDEFINED" for d in diags)
