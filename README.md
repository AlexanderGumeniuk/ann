# 🎮 Найди друг друга ❤️

Мобильная RPG-платформер игра для двоих. Выберите персонажа (Саша или Аня) и найдите друг друга в конце уровня!

## 🚀 Быстрый старт (локально)

### Вариант 1: Python HTTP Server
```bash
# Перейти в папку с собранным проектом
cd dist

# Запустить сервер
python3 -m http.server 8080

# Открыть в браузере: http://localhost:8080
```

### Вариант 2: Node.js (после сборки)
```bash
# Сборка проекта
npm run build

# Запуск превью
npx serve dist
```

## 🌐 Развёртывание на Ubuntu (Nginx)

### 1. Установка Nginx
```bash
sudo apt update
sudo apt install nginx -y
```

### 2. Копирование файлов
```bash
# Создать директорию для сайта
sudo mkdir -p /var/www/game

# Скопировать собранные файлы
sudo cp -r dist/* /var/www/game/

# Установить права
sudo chown -R www-data:www-data /var/www/game
sudo chmod -R 755 /var/www/game
```

### 3. Конфигурация Nginx
```bash
sudo nano /etc/nginx/sites-available/game
```

Вставьте:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # или IP сервера

    root /var/www/game;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статики
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Активируйте сайт:
```bash
sudo ln -s /etc/nginx/sites-available/game /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Открыть порт в Firewall (UFW)
```bash
# Разрешить HTTP
sudo ufw allow 80/tcp

# Разрешить HTTPS (если есть SSL)
sudo ufw allow 443/tcp

# Проверить статус
sudo ufw status
```

### 5. (Опционально) SSL через Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 📱 Доступ с телефона

1. Убедитесь, что телефон и сервер в одной сети (или сервер имеет публичный IP)
2. Откройте браузер на телефоне
3. Перейдите по адресу: `http://IP-СЕРВЕРА` (или домен)
4. Добавьте на главный экран для полноэкранного режима!

## 🎮 Управление

### Мобильное:
- **← →** — кнопки движения внизу слева
- **↑** — кнопка прыжка внизу справа

### Клавиатура (десктоп):
- **Стрелки** или **WASD** — движение
- **Пробел** или **↑** — прыжок

## 🛠️ Разработка

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev

# Сборка для продакшена
npm run build
```

## ❤️ Сделано с любовью для Анны
