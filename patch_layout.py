import re

with open('frontend/src/components/DashboardLayout.tsx', 'r') as f:
    content = f.read()

# Replace extractInitials block
content = re.sub(
    r'const extractInitials = \(name\?: string\) => \{.*?\n  \};\n\n',
    '',
    content,
    flags=re.DOTALL
)

# Replace the logo usage
content = re.sub(
    r'<span className="text-\[var\(--color-accent\)\] font-bold text-sm">\s*\{extractInitials\(user\?\.businessName\)\}\s*</span>',
    '<Store className="text-[var(--color-accent)] w-5 h-5" />',
    content
)

# Replace the notification badge
content = re.sub(
    r'<span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-\[var\(--color-danger\)\]"></span>',
    '{/* <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[var(--color-danger)]"></span> */}',
    content
)

with open('frontend/src/components/DashboardLayout.tsx', 'w') as f:
    f.write(content)
