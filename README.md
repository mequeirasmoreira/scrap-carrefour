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

## Dificuldades encontradas
- O botão de busca por CEP poderia ter vindo com cache via localStorage, por isso optei por não manter uma instância permanente no navegador.
- O botão de inserir o CEP é, na verdade, uma div contendo um button, o que gerou confusão ao tentar buscar diretamente pela tag <button>. Acabei recorrendo à alternativa via CSS, utilizando os seletores que o fs oferece para manipulação do DOM.
- Existe um botão de chat que utiliza os mesmos seletores CSS do botão de localizar o CEP. Por isso, precisei interceptar esse evento no carregamento da árvore DOM (DOMContentLoaded) e remover a instância duplicada.
- Para resolver esses três problemas, precisei aguardar as conexões da página serem tratadas corretamente. Foi aí que descobri o networkidle2, já que eu estava acostumado apenas com o networkidle0. O networkidle2 se mostrou mais eficaz, principalmente em páginas com Next.js, pois evita interrupções nas conexões e permite validar os itens com mais precisão em intervalos de tempo.
- Meu dispositivo tem uma tela grande, o que alterava o viewport e, consequentemente, mudava a configuração dos elementos via CSS. Isso gerava inconsistências no posicionamento dos componentes. Mais à frente vou detalhar melhor esse ponto, mas a solução foi forçar o viewport manualmente para evitar que a estrutura do código quebrasse.
- Alguns produtos apresentavam dois preços (antes e depois do desconto) com os mesmos seletores, diferenciando-se apenas pela cor do texto. Como o site usa Tailwind, isso facilitou bastante: consegui manipular o DOM usando seletores genéricos porém precisos, sem perder o foco no elemento correto.
- O grid de produtos incluía itens patrocinados, o que causava duplicidade. Isso fez com que o número de produtos informados na tag de contagem fosse diferente da quantidade real renderizada por página. A lógica da renderização era algo como:
```
número total informado na página = numElemPage
número de itens renderizados por página = numIteRend
maior número de páginas na navegação = maxNumPage

SE (maxNumPage * numIteRend) < numElemPage
→ última página terá menos itens

PORÉM...
Ao executar, o total de itens era maior do que o previsto, pois alguns produtos (ex: Red Bull Energy Drink) apareciam em mais de uma página.
```
- O que fiz com esse problema? Nada 😅. Como utilizamos um normalizador que verifica o link e o nome padronizado do item (No teste anterior), isso não interferiu no resultado final.
- O tempo de execução para carregar uma página com 60 itens estava acima do ideal. Por isso, estabeleci um timeout de 5000ms para garantir que tudo fosse carregado com segurança antes de continuar o processo.
