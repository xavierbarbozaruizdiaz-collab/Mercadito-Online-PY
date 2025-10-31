# Guía de Deployment - Mercadito Online PY

## Resumen de Configuraciones Creadas

Se han creado múltiples archivos de configuración para diferentes entornos y herramientas de deployment:

### Configuraciones de Deployment

1. **Vercel** (`vercel.json`, `vercel.config.yml`)
   - Configuración para deployment en Vercel
   - Headers de seguridad
   - Cron jobs configurados

2. **Docker** (`Dockerfile`, `docker-compose.prod.yml`)
   - Containerización para producción
   - Compose file con Redis y Nginx

3. **Kubernetes** (`k8s-deployment.yaml`, `helm-chart.yaml`)
   - Deployments para K8s
   - Helm chart para gestión

4. **Terraform** (`terraform.tf`)
   - Infrastructure as Code para AWS
   - VPC, ECS, CloudWatch configurados

5. **Ansible** (`ansible-playbook.yml`)
   - Automatización de deployment en servidores
   - Configuración de Nginx y servicios

6. **GitHub Actions** (`.github/workflows/deploy.yml`)
   - CI/CD pipeline completo
   - Tests, build y deployment automático

### Variables de Entorno

El archivo `env.production.example` contiene todas las variables necesarias para producción. Copia este archivo y completa con tus valores reales.

### Opciones de Deployment

#### Opción 1: Vercel (Recomendado - Más Simple)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy a producción
vercel --prod
```

#### Opción 2: Docker

```bash
# Build de la imagen
docker build -t mercadito-online-py:latest .

# Run con docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

#### Opción 3: Kubernetes

```bash
# Aplicar deployment
kubectl apply -f k8s-deployment.yaml

# O usar Helm
helm install mercadito-online-py ./helm-chart
```

#### Opción 4: AWS con Terraform

```bash
# Inicializar Terraform
terraform init

# Plan
terraform plan

# Aplicar
terraform apply
```

#### Opción 5: Servidor VPS con Ansible

```bash
# Ejecutar playbook
ansible-playbook -i inventory ansible-playbook.yml
```

### Checklist Pre-Deployment

- [ ] Variables de entorno configuradas
- [ ] Secrets configurados en la plataforma
- [ ] Base de datos migrada
- [ ] Storage buckets configurados
- [ ] DNS configurado
- [ ] SSL/TLS certificados obtenidos
- [ ] Monitoreo configurado
- [ ] Backups configurados

### Monitoreo Post-Deployment

1. Verificar health checks: `/health`
2. Revisar logs de aplicación
3. Monitorear métricas de performance
4. Verificar uptime
5. Probar funcionalidades críticas

### Rollback

En caso de problemas, todas las configuraciones soportan rollback:

- **Vercel**: Dashboard de Vercel
- **K8s**: `kubectl rollout undo`
- **Docker**: `docker-compose rollback`
- **Ansible**: Re-ejecutar playbook con versión anterior
