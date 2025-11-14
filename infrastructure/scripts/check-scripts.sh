#!/bin/bash

# Script to check all deployment scripts for common issues

echo "Checking deployment scripts..."
echo ""

# Check for executable permissions
echo "📝 Checking file permissions:"
for script in infrastructure/scripts/*.sh; do
    if [ -x "$script" ]; then
        echo "✅ $script is executable"
    else
        echo "❌ $script is NOT executable - run: chmod +x $script"
    fi
done

echo ""
echo "📝 Checking line endings:"
for script in infrastructure/scripts/*.sh; do
    if file "$script" | grep -q "CRLF"; then
        echo "❌ $script has Windows line endings (CRLF)"
        echo "   Fix with: perl -pi -e 's/\r\n|\r/\n/g' $script"
    else
        echo "✅ $script has Unix line endings (LF)"
    fi
done

echo ""
echo "📝 Checking bash syntax:"
for script in infrastructure/scripts/*.sh; do
    if bash -n "$script" 2>/dev/null; then
        echo "✅ $script syntax is valid"
    else
        echo "❌ $script has syntax errors:"
        bash -n "$script"
    fi
done

echo ""
echo "Done! Upload these scripts to your server."
