Lead SaaS - Instruções de desenvolvimento

Passos rápidos (Windows PowerShell):

1) Backend (lead-saas)
```powershell
cd 'c:/Users/DELL/Desktop/Projeto Prospect SASS/projeto/lead-saas'
npm install
copy .env.template .env
# editar .env se quiser usar Postgres (DATABASE_URL)
# gerar prisma client e aplicar migrations (se necessário):
npm run prisma:generate
# npm run prisma:migrate
npm run dev
```

2) Frontend (lead-frontend)
```powershell
cd 'c:/Users/DELL/Desktop/Projeto Prospect SASS/projeto/lead-frontend'
npm install
npm run dev
```

Chakra UI (melhorar UI rapidamente):
```powershell
cd 'c:/Users/DELL/Desktop/Projeto Prospect SASS/projeto/lead-frontend'
npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion
```

3) Docker (opcional)
```powershell
cd 'c:/Users/DELL/Desktop/Projeto Prospect SASS/projeto/infra'
docker compose -f docker-compose.dev.yml up -d
```

Notas:
- Upload de logo: envie arquivo `file` para `POST /branding/upload`. O arquivo será salvo em `lead-saas/public/uploads` e disponível em `/uploads/<filename>`.
- Branding: GET/POST `/branding` para buscar/atualizar configurações (logoUrl, cores). O frontend aplica cores como variáveis CSS automaticamente após login.
