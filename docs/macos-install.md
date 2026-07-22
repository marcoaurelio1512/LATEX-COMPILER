# Instalação no macOS

## 1. Pré-requisitos

- macOS 13+
- Python 3.9+
- Node.js 18+
- (Recomendado) MacTeX ou BasicTeX + latexmk
- (Opcional) Docker Desktop

## 2. TeX

```bash
brew install --cask mactex-no-gui
# ou
brew install --cask mactex
```

Abra um **novo** terminal e confira:

```bash
./scripts/check-dependencies.sh
```

## 3. Aplicação

```bash
./scripts/setup-macos.sh
make dev
```

- Interface: http://localhost:3000
- API/docs: http://127.0.0.1:8000/docs

## 4. Docker (opcional)

```bash
./scripts/build-compiler-image.sh
```

Na barra superior, alterne o modo para **Docker**.
