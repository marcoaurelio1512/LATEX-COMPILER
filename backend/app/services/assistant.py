from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from app.schemas.common import Diagnostic

SUGGESTIONS = {
    "UNDEFINED_CONTROL_SEQUENCE": (
        "Verifique se o comando está escrito corretamente ou se o pacote "
        "necessário foi importado."
    ),
    "FILE_NOT_FOUND": "Verifique o caminho, nome e extensão do arquivo.",
    "CITATION_UNDEFINED": (
        "Verifique se a chave existe no arquivo .bib e se o backend "
        "bibliográfico (Biber/BibTeX) foi executado."
    ),
    "REFERENCE_UNDEFINED": (
        "Compile novamente; se persistir, confira o rótulo \\label correspondente."
    ),
    "PACKAGE_ERROR": "Confira a documentação do pacote e as opções usadas.",
    "MISSING_BRACE": "Há chaves { } desbalanceadas próximo à linha indicada.",
    "EMERGENCY_STOP": "A compilação foi interrompida por um erro fatal anterior.",
    "TIMEOUT": "Aumente o timeout nas configurações ou simplifique o documento.",
    "CANCELLED": "A compilação foi cancelada pelo usuário.",
    "BIBER_ERROR": (
        "Verifique o arquivo .bib e a configuração do Biber."
    ),
    "SHELL_ESCAPE": (
        "Aviso de segurança esperado no Studio (shell-escape desligado). "
        "Pode ignorar."
    ),
    "LATEX_RERUN": (
        "O LaTeX pede outra passagem. Clique em Limpar e compilar."
    ),
}


class DiagnosticAssistant(ABC):
    @abstractmethod
    async def explain_error(
        self,
        diagnostic: Diagnostic,
        context: Optional[str] = None,
    ) -> str:
        ...


class DeterministicAssistant(DiagnosticAssistant):
    """Sugestões locais determinísticas — nenhum conteúdo é enviado a APIs externas."""

    async def explain_error(
        self,
        diagnostic: Diagnostic,
        context: Optional[str] = None,
    ) -> str:
        if diagnostic.suggestion:
            return diagnostic.suggestion
        return SUGGESTIONS.get(
            diagnostic.code,
            "Revise a mensagem no log e a linha indicada no arquivo-fonte.",
        )


default_assistant = DeterministicAssistant()
