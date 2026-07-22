.PHONY: setup dev start stop iniciar parar test check-deps build-compiler frontend-build

setup:
	./scripts/setup-macos.sh

dev:
	./scripts/dev.sh

start iniciar:
	./scripts/iniciar.sh

stop parar:
	./scripts/parar.sh

check-deps:
	./scripts/check-dependencies.sh

build-compiler:
	./scripts/build-compiler-image.sh

test:
	cd backend && .venv/bin/pytest -q

frontend-build:
	cd frontend && npm run build
