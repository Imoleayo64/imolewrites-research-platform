import os

# The hidden/heavy folders we want to completely ignore
IGNORE_DIRS = {'.git', '.venv', 'venv', '__pycache__', 'node_modules'}

with open('clean_structure.txt', 'w', encoding='utf-8') as f:
    for root, dirs, files in os.walk('.'):
        # Remove ignored directories so we don't scan them
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        # Calculate folder depth for indentation
        rel_path = os.path.relpath(root, '.')
        if rel_path == '.':
            level = 0
            folder_name = 'IMOLEWRITES-PLATFORM'
        else:
            level = rel_path.count(os.sep) + 1
            folder_name = os.path.basename(root)
            
        indent = '    ' * level
        f.write(f"{indent}📁 {folder_name}/\n")
        
        subindent = '    ' * (level + 1)
        for file in files:
            # Skip junk files and the tree files themselves
            if not file.endswith('.pyc') and file not in ['map.py', 'structure.txt', 'clean_structure.txt']:
                f.write(f"{subindent}📄 {file}\n")

print("Clean structure saved to clean_structure.txt!")