echo "🏪 TokoBaju E-commerce Setup Script"
echo "=================================="
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}
print_error() {
    echo -e "${RED}❌ $1${NC}"
}
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}
check_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$MAJOR_VERSION" -ge 14 ]; then
            print_success "Node.js version is compatible"
        else
            print_error "Node.js version should be >= 14. Please update Node.js"
            exit 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js >= 14"
        exit 1
    fi
}
check_mysql() {
    if command -v mysql &> /dev/null; then
        print_success "MySQL is installed"
    else
        print_error "MySQL is not installed. Please install MySQL"
        exit 1
    fi
}
check_npm() {
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm is installed: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
}
install_dependencies() {
    print_info "Installing Node.js dependencies..."
    if npm install; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}
create_env_file() {
    if [ ! -f .env ]; then
        print_info "Creating .env file..."
        echo
        read -p "Enter MySQL host (default: localhost): " DB_HOST
        DB_HOST=${DB_HOST:-localhost}
        read -p "Enter MySQL username (default: root): " DB_USER
        DB_USER=${DB_USER:-root}
        read -s -p "Enter MySQL password: " DB_PASSWORD
        echo
        read -p "Enter database name (default: tokobaju): " DB_NAME
        DB_NAME=${DB_NAME:-tokobaju}
        read -p "Enter server port (default: 3000): " PORT
        PORT=${PORT:-3000}
        JWT_SECRET=$(openssl rand -base64 32)
        cat > .env << EOL
# Database Configuration
DB_HOST=$DB_HOST
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
# JWT Secret Key
JWT_SECRET=$JWT_SECRET
# Server Configuration
PORT=$PORT
NODE_ENV=development
# CORS Configuration
CORS_ORIGIN=http://localhost:$PORT
EOL
        print_success ".env file created successfully"
    else
        print_warning ".env file already exists, skipping..."
    fi
}
setup_database() {
    print_info "Setting up database..."
    source .env
    DB_EXISTS=$(mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD -e "SHOW DATABASES LIKE '$DB_NAME';" | grep $DB_NAME)
    if [ -z "$DB_EXISTS" ]; then
        print_info "Creating database '$DB_NAME'..."
        mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        if [ $? -eq 0 ]; then
            print_success "Database '$DB_NAME' created successfully"
        else
            print_error "Failed to create database"
            exit 1
        fi
    else
        print_warning "Database '$DB_NAME' already exists"
    fi
    if [ -f database_schema.sql ]; then
        print_info "Importing database schema..."
        mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME < database_schema.sql
        if [ $? -eq 0 ]; then
            print_success "Database schema imported successfully"
        else
            print_error "Failed to import database schema"
            exit 1
        fi
    else
        print_error "database_schema.sql file not found"
        exit 1
    fi
    if [ -f create_admin_user.sql ]; then
        print_info "Importing initial data..."
        mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME < create_admin_user.sql
        
        if [ $? -eq 0 ]; then
            print_success "Initial data imported successfully"
        else
            print_error "Failed to import initial data"
            exit 1
        fi
    else
        print_error "create_admin_user.sql file not found"
        exit 1
    fi
}
create_directories() {
    print_info "Creating necessary directories..."
    
    mkdir -p public/images
    mkdir -p logs
    
    print_success "Directories created successfully"
}
set_permissions() {
    if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
        print_info "Setting file permissions..."
        chmod +x setup.sh
        chmod 755 public
        chmod 755 admin
        print_success "File permissions set successfully"
    fi
}
test_server() {
    print_info "Testing server..."
    npm start &
    SERVER_PID=$!
    sleep 5
    if curl -f http://localhost:$PORT/api/categories &> /dev/null; then
        print_success "Server is running and responding"
        kill $SERVER_PID 2>/dev/null
        return 0
    else
        print_error "Server is not responding"
        kill $SERVER_PID 2>/dev/null
        return 1
    fi
}
main() {
    echo
    print_info "Starting TokoBaju setup process..."
    echo
    print_info "Checking system requirements..."
    check_nodejs
    check_mysql
    check_npm
    echo
    install_dependencies
    echo
    create_env_file
    echo
    setup_database
    echo
    create_directories
    echo
    set_permissions
    echo
    if test_server; then
        echo
        print_success "🎉 Setup completed successfully!"
        echo
        print_info "You can now start the server with:"
        echo "  npm start          # Production mode"
        echo "  npm run dev        # Development mode"
        echo
        print_info "Access your application at:"
        echo "  Website:     http://localhost:$PORT"
        echo "  Admin Panel: http://localhost:$PORT/admin"
        echo
        print_info "Default admin credentials:"
        echo "  Email:    admin@tokobaju.com"
        echo "  Password: admin123"
        echo
        print_warning "Don't forget to change the default admin password!"
    else
        echo
        print_error "Setup completed but server test failed"
        print_info "Please check the logs and try starting the server manually"
    fi
}
main
exit 0