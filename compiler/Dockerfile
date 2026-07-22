FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-lang-portuguese \
    texlive-bibtex-extra \
    texlive-science \
    texlive-luatex \
    texlive-xetex \
    latexmk \
    biber \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin compiler \
    && mkdir -p /workspace \
    && chown -R compiler:compiler /workspace

WORKDIR /workspace
USER compiler

# Default: no network in runtime via docker run --network none
ENTRYPOINT ["latexmk"]
