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

## Requisitos
- Node.js
- NPM ou Yarn

## Instalação
1. Clone o repositório:
```bash
git clone https://github.com/mequeirasmoreira/scrap-carrefour.git
cd scrap-carrefour
```

2. Instale as dependências:
```bash
npm install
```

## Uso
Execute o script principal:
```bash
node index.js
```

Os dados coletados serão salvos em `output.json` e as estatísticas em `stats.json`.

## Configuração
Você pode modificar as seguintes variáveis no início do arquivo `index.js`:
- `url`: URL da página de produtos a ser raspada
- `cep`: CEP a ser utilizado para definir a localização

## Notas
- Este scraper foi desenvolvido apenas para fins educacionais
- O uso de web scrapers pode ser contra os termos de serviço de alguns sites
- A estrutura do site pode mudar, o que pode quebrar o funcionamento do scraper

## Licença
MIT
