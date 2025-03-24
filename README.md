# Scraper do Carrefour

## Descrição
Este projeto é um web scraper para o site do Carrefour que coleta informações de produtos da seção de bebidas. Ele utiliza Puppeteer para automatizar a navegação no site e extrair dados como título, preço e link dos produtos.

## Funcionalidades
- Navegação automatizada no site do Carrefour
- Configuração de CEP para simular localização específica
- Coleta de informações de produtos (título, preço, link)
- Geração de ID único para cada produto
- Paginação automática para coletar produtos de múltiplas páginas
- Salvamento dos dados em formato JSON

Os dados coletados serão salvos em `output.json` e as estatísticas em `stats.json`.

## Configuração
Você pode modificar as seguintes variáveis no início do arquivo `index.js`:
- `url`: URL da página de produtos a ser raspada
- `cep`: CEP a ser utilizado para definir a localização
