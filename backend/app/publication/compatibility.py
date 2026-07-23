from __future__ import annotations

from pathlib import Path

from app.publication.models import TemplateManifest


COMPAT_STY = r"""%% LaTeX Studio — camada de compatibilidade de conteúdo
\ProvidesPackage{studio-compat}

\providecommand{\DocumentTitle}[1]{\title{#1}}
\providecommand{\DocumentAuthor}[1]{\author{#1}}
\providecommand{\DocumentDate}[1]{\date{#1}}
\providecommand{\DocumentAbstract}[1]{\begin{abstract}#1\end{abstract}}

\providecommand{\ProjectTitle}{\DocumentTitle}
\providecommand{\ProjectAuthor}{\DocumentAuthor}
"""


def write_compat_sty(dest_dir: Path, manifest: TemplateManifest) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    path = dest_dir / "studio-compat.sty"
    path.write_text(COMPAT_STY + "\n", encoding="utf-8")
    return path
