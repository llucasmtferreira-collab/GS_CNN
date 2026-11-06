# Dados do projeto

O arquivo `ocorrencias_capital_2025.csv` foi extraído do arquivo público `SPDadosCriminais_2025.xlsx`, da Secretaria da Segurança Pública de São Paulo (SSP-SP), abas `JAN-JUN_2025` e `JUL-DEZ_2025`.

Fonte: https://www.ssp.sp.gov.br/estatistica/consultas

O recorte contém apenas registros do município do fato em São Paulo e as naturezas `FURTO - OUTROS` e `ROUBO - OUTROS`, com as colunas mínimas necessárias para filtrar datas, verificar BOs duplicados e construir quatro atributos.

O notebook realiza os filtros finais por data de ocorrência, deduplicação, tratamento de ausentes, amostragem, separação e codificação. Não inclui dados pessoais das vítimas.
