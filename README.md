# Linkly - Production-Ready URL Shortener

Sistema de encurtamento de URLs com arquitetura otimizada para **baixa latência** e **alto throughput**.

## 🎯 Características Técnicas

- **Unicidade garantida**: Base62 encoding de IDs sequenciais (zero colisões)
- **Baixa latência**: Cache-first com Redis (target: p50 < 50ms)
- **Read-optimized**: Separação clara de write/read paths
- **Escalável**: Suporta trilhões de URLs
- **Observable**: Métricas de cliques integradas

## 🏗️ Arquitetura

### Decisões Técnicas

| Aspecto | Escolha | Justificativa |
|---------|---------|---------------|
| ID Generation | Base62 (incremental) | Zero colisões, previsível |
| Database | PostgreSQL + índices | ACID + performance |
| Cache | Redis | Sub-ms lookups |
| Redirect | HTTP 302 | Analytics completo |
| Backend | Node.js + Express | Simplicidade + performance |

### Performance Targets

- **Redirect latency**: p50 < 50ms, p99 < 200ms
- **Cache hit ratio**: > 95%
- **Throughput**: > 10k redirects/s por instância

## 🚀 Setup Rápido

### Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Instalação

```bash
# Clone e instale dependências
npm install

# Configure ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Crie database
createdb linkly

# Execute migrations
npm run db:migrate

# Inicie servidor
npm run dev
```

## 📡 API Usage

### Encurtar URL

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/url"}'
```

Resposta:
```json
{
  "shortUrl": "http://localhost:3000/a1b2c3",
  "shortCode": "a1b2c3",
  "originalUrl": "https://example.com/very/long/url",
  "isNew": true
}
```

### Redirecionar

```bash
curl -L http://localhost:3000/a1b2c3
# Redireciona para URL original (HTTP 302)
```

### Analytics

```bash
curl http://localhost:3000/api/stats/a1b2c3
```

Resposta:
```json
{
  "short_code": "a1b2c3",
  "original_url": "https://example.com/very/long/url",
  "click_count": 42,
  "created_at": "2025-12-15T23:00:00Z",
  "expires_at": null
}
```

## 📊 Observabilidade

### Health Check

```bash
curl http://localhost:3000/api/health
```

Retorna status de database, cache e cache hit ratio.

### Admin Endpoints

```bash
# Cleanup de URLs expiradas
curl -X POST http://localhost:3000/api/admin/cleanup

# Preload de cache
curl -X POST http://localhost:3000/api/admin/preload-cache \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000}'
```

## 🔒 Segurança

- Validação rigorosa de URLs
- Proteção contra XSS
- Headers de segurança (CSP, X-Frame-Options)
- Rate limiting (próxima fase)

## 🏛️ Decisões de Design (Staff-Level)

### Por que Base62 e não Hash?

Hashing (MD5, SHA) causa colisões inevitáveis. Com 1M URLs:
- 6 chars hash: ~0.6% chance de colisão
- Base62 incremental: 0% chance (determinístico)

### Por que 302 e não 301?

301 (permanent) permite browser caching, mas:
- ❌ Perde analytics (browser não faz request)
- ❌ Não permite mudar destino

302 (temporary):
- ✅ Todas requests passam pelo servidor
- ✅ Analytics completo
- ✅ Flexibilidade

### Por que PostgreSQL e não NoSQL?

- ✅ ACID transactions (crucial para uniqueness)
- ✅ Índices B-tree otimizados
- ✅ Auto-increment confiável
- ✅ Analytics queries (SQL > NoSQL para agregações)

## 📈 Próximas Fases

### v2 - Analytics Avançado
- Geolocalização de cliques
- User-agent tracking
- Referrer analytics

### v3 - Features Premium
- Custom aliases (vanity URLs)
- Bulk creation API
- QR code generation

### v4 - Enterprise
- Multi-tenancy
- API authentication (JWT)
- Dashboard administrativo

## 📝 Licença

MIT
