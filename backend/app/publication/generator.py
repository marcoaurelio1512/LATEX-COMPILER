from __future__ import annotations

from pathlib import Path
from typing import Optional

from app.publication.compatibility import write_compat_sty
from app.publication.manager import get_template
from app.publication.models import ProjectMetadata, ProjectType, TemplateManifest
from app.schemas.common import ProjectConfig
from app.services.project_config import save_project_config


def _opts(manifest: TemplateManifest) -> str:
    if not manifest.class_options:
        return ""
    return "[" + ",".join(manifest.class_options) + "]"


def _main_tex(meta: ProjectMetadata, manifest: TemplateManifest) -> str:
    opts = _opts(manifest)
    bib_line = ""
    if meta.bibliography in {"biber", "auto"}:
        bib_line = "\\usepackage[backend=biber,style=authoryear]{biblatex}\n\\addbibresource{references/references.bib}\n"
    elif meta.bibliography == "bibtex":
        bib_line = "% Bibliografia BibTeX — use \\bibliography{references/references} no final se necessário\n"

    body_input = "\\input{content/body.tex}\n"
    if meta.projectType in {"book", "thesis", "dissertation", "monograph"}:
        body_input = (
            "\\input{content/chapters/01-introducao.tex}\n"
            "\\input{content/chapters/02-desenvolvimento.tex}\n"
            "\\input{content/chapters/99-conclusao.tex}\n"
        )
    if meta.projectType == "beamer":
        body_input = "\\input{content/slides.tex}\n"

    print_bib = "\\printbibliography\n" if meta.bibliography in {"biber", "auto"} else ""
    if meta.bibliography == "bibtex":
        print_bib = "\\bibliographystyle{plain}\n\\bibliography{references/references}\n"

    return f"""% Gerado pelo LaTeX Studio — wrapper de template
% Conteúdo em content/; template em templates/{manifest.id}/
\\documentclass{opts}{{{manifest.document_class}}}
\\usepackage{{studio-compat}}
\\usepackage[T1]{{fontenc}}
\\usepackage[utf8]{{inputenc}}
\\usepackage[brazilian]{{babel}}
\\usepackage{{graphicx}}
\\graphicspath{{{{content/figures/}}}}
{bib_line}
\\makeatletter
\\@ifundefined{{input@path}}{{\\let\\input@path\\@empty}}{{}}
\\def\\input@path{{{{templates/{manifest.id}/}}{{templates/{manifest.id}/}}}}
\\makeatother

\\begin{{document}}
\\input{{content/frontmatter.tex}}
{body_input}{print_bib}\\end{{document}}
""".replace("{opts}", opts)


def _frontmatter(meta: ProjectMetadata, manifest: TemplateManifest) -> str:
    if meta.projectType == "beamer":
        return (
            f"\\DocumentTitle{{{meta.projectName}}}\n"
            "\\DocumentAuthor{Seu nome}\n"
            "\\DocumentDate{\\today}\n"
            "\\maketitle\n"
        )
    if manifest.document_class.lower() in {"ieeetran"}:
        return (
            f"\\DocumentTitle{{{meta.projectName}}}\n"
            "\\DocumentAuthor{Seu nome\\\\Instituição}\n"
            "\\maketitle\n"
            "\\DocumentAbstract{Resumo do trabalho.}\n"
            "\\begin{IEEEkeywords}template, latex, studio\\end{IEEEkeywords}\n"
        )
    return (
        f"\\DocumentTitle{{{meta.projectName}}}\n"
        "\\DocumentAuthor{Seu nome}\n"
        "\\DocumentDate{\\today}\n"
        "\\maketitle\n"
        "\\tableofcontents\n"
    )


def generate_publication_project(
    root: Path,
    *,
    name: str,
    project_type: ProjectType,
    template_id: str,
) -> ProjectMetadata:
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)
    manifest = get_template(template_id)
    if project_type not in manifest.project_types and "custom" not in manifest.project_types:
        # still allow, with warning baked into metadata.extra
        pass

    meta = ProjectMetadata(
        projectName=name,
        projectType=project_type,
        template=manifest.id,
        documentClass=manifest.document_class,
        engine=manifest.engine,
        bibliography=manifest.bibliography if manifest.bibliography != "auto" else "biber",
        language="pt-BR",
        mainFile="main.tex",
    )

    # dirs
    for d in [
        "content/chapters",
        "content/figures",
        "content/tables",
        "references",
        f"templates/{manifest.id}",
        "config",
        "build",
        "output",
        "logs",
    ]:
        (root / d).mkdir(parents=True, exist_ok=True)

    # copy imported template files into project
    if manifest.source == "imported" and manifest.path:
        import shutil
        src = Path(manifest.path)
        dest = root / "templates" / manifest.id
        if src.exists():
            for item in src.iterdir():
                if item.name == "manifest.json":
                    continue
                target = dest / item.name
                if item.is_dir():
                    if target.exists():
                        shutil.rmtree(target)
                    shutil.copytree(item, target)
                else:
                    shutil.copy2(item, target)

    write_compat_sty(root / "templates" / manifest.id, manifest)
    # also expose at project root for \usepackage{studio-compat} via TEXINPUTS-like path:
    # latex looks in cwd; we put a copy at templates/ and add to main via relative package path hack:
    # simpler: put studio-compat.sty at project root
    write_compat_sty(root, manifest)

    (root / "main.tex").write_text(_main_tex(meta, manifest), encoding="utf-8")
    (root / "content" / "frontmatter.tex").write_text(_frontmatter(meta, manifest), encoding="utf-8")

    if meta.projectType in {"book", "thesis", "dissertation", "monograph"}:
        (root / "content/chapters/01-introducao.tex").write_text(
            "\\chapter{Introdução}\n\nEscreva a introdução.\n\nCite: \\cite{silva2020}.\n",
            encoding="utf-8",
        )
        (root / "content/chapters/02-desenvolvimento.tex").write_text(
            "\\chapter{Desenvolvimento}\n\nDesenvolva o conteúdo principal.\n",
            encoding="utf-8",
        )
        (root / "content/chapters/99-conclusao.tex").write_text(
            "\\chapter{Conclusão}\n\nConsolide os resultados.\n",
            encoding="utf-8",
        )
        (root / "content" / "body.tex").write_text("% body alternativo\n", encoding="utf-8")
    elif meta.projectType == "beamer":
        (root / "content" / "slides.tex").write_text(
            "\\begin{frame}{Slide 1}\nConteúdo\\end{frame}\n",
            encoding="utf-8",
        )
        (root / "content" / "body.tex").write_text("% unused\n", encoding="utf-8")
    else:
        (root / "content" / "body.tex").write_text(
            "\\section{Introdução}\n\nTexto do artigo.\n\n\\cite{silva2020}\n\n"
            "\\section{Conclusão}\n\nConclusões.\n",
            encoding="utf-8",
        )

    (root / "references" / "references.bib").write_text(
        """@book{silva2020,
  author    = {Silva, Maria},
  title     = {Produção intelectual e tecnologia},
  publisher = {Editora Exemplo},
  year      = {2020},
  address   = {São Paulo},
}
""",
        encoding="utf-8",
    )
    (root / "content/figures" / "LEIA-ME.txt").write_text(
        "Coloque figuras aqui.\n", encoding="utf-8"
    )
    (root / "README.md").write_text(
        f"""# {name}

Projeto LaTeX Studio Local

- Tipo: `{project_type}`
- Template: `{manifest.id}` (`{manifest.document_class}`)
- Conteúdo: `content/`
- Referências: `references/references.bib`
- Template local: `templates/{manifest.id}/`

Escreva só o conteúdo. Para trocar o template, use o painel Templates no Studio.
""",
        encoding="utf-8",
    )
    (root / ".gitignore").write_text(
        ".latex-local/\nbuild/\noutput/\nlogs/\n*.aux\n*.log\n*.pdf\n.DS_Store\n",
        encoding="utf-8",
    )
    (root / "metadata.json").write_text(meta.model_dump_json(indent=2) + "\n", encoding="utf-8")

    # sync legacy compiler config
    save_project_config(
        root,
        ProjectConfig(
            main_file="main.tex",
            engine=meta.engine,
            bibliography=meta.bibliography if meta.bibliography != "none" else "none",
            auto_compile=False,
            compiler_mode="native",
        ),
    )
    return meta


def load_metadata(root: Path) -> Optional[ProjectMetadata]:
    path = Path(root) / "metadata.json"
    if not path.exists():
        return None
    return ProjectMetadata.model_validate_json(path.read_text(encoding="utf-8"))


def save_metadata(root: Path, meta: ProjectMetadata) -> None:
    (Path(root) / "metadata.json").write_text(meta.model_dump_json(indent=2) + "\n", encoding="utf-8")


def switch_project_template(root: Path, template_id: str) -> ProjectMetadata:
    """Troca o template sem alterar content/ nem references/."""
    import shutil

    root = Path(root)
    meta = load_metadata(root)
    if not meta:
        raise FileNotFoundError("Projeto sem metadata.json — não é um projeto de publicação")
    manifest = get_template(template_id)
    old_id = meta.template
    meta.template = manifest.id
    meta.documentClass = manifest.document_class
    meta.engine = manifest.engine
    if manifest.bibliography != "auto":
        meta.bibliography = manifest.bibliography

    dest = root / "templates" / manifest.id
    dest.mkdir(parents=True, exist_ok=True)
    if manifest.source == "imported" and manifest.path:
        src = Path(manifest.path)
        if src.exists():
            for item in src.iterdir():
                if item.name == "manifest.json":
                    continue
                target = dest / item.name
                if item.is_dir():
                    if target.exists():
                        shutil.rmtree(target)
                    shutil.copytree(item, target)
                else:
                    shutil.copy2(item, target)

    write_compat_sty(dest, manifest)
    write_compat_sty(root, manifest)
    (root / "main.tex").write_text(_main_tex(meta, manifest), encoding="utf-8")
    save_metadata(root, meta)
    save_project_config(
        root,
        ProjectConfig(
            main_file=meta.mainFile,
            engine=meta.engine,
            bibliography=meta.bibliography if meta.bibliography != "none" else "none",
            auto_compile=False,
            compiler_mode="native",
        ),
    )
    # remove pasta do template antigo se diferente e vazia de uso (não apaga se usuário customizou)
    if old_id and old_id != manifest.id:
        meta.extra["previousTemplate"] = old_id
        save_metadata(root, meta)
    return meta
