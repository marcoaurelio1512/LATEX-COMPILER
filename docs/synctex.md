# SyncTeX — ponto de extensão

A compilação já usa `-synctex=1`. O arquivo `.synctex.gz` é gerado em:

```text
<projeto>/.latex-local/build/<main>.synctex.gz
```

O job de compilação persiste `synctex_path` no SQLite.

## Extensão futura (não bloqueia o MVP)

1. **Código → PDF**: ao clicar no editor, consultar o SyncTeX (via `synctex` CLI ou parser) e navegar a página/posição no preview.
2. **PDF → código**: ao clicar no PDF, resolver arquivo/linha e abrir no Monaco.

Nenhuma chamada de rede é necessária — tudo local.
