# Contributing Guidelines

## Branch Naming

Follow this convention for all feature branches:

- `feature/pr-XX-description` - New features (e.g., `feature/pr-01-infrastructure`)
- `bugfix/pr-XX-description` - Bug fixes (e.g., `bugfix/pr-02-auth-token`)
- `hotfix/description` - Critical production fixes
- `docs/description` - Documentation updates

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `style:` - Code style changes (formatting, etc.)

### Examples

```bash
feat(auth): add JWT token refresh endpoint
fix(upload): resolve S3 presigned URL expiration
docs(readme): update installation instructions
test(templates): add unit tests for variable parser
chore(deps): update Next.js to 16.0.1
```

## Pull Request Process

### 1. Create Branch

```bash
# Create branch from main
git checkout main
git pull origin main
git checkout -b feature/pr-XX-description
```

### 2. Make Changes

- Follow the [Engineering Roadmap](./docs/Initialdocs/ENGINEERING_ROADMAP.md)
- Write clean, documented code
- Add tests for new functionality
- Update relevant documentation

### 3. Test Your Changes

```bash
# Frontend tests
cd frontend
pnpm lint
pnpm build
pnpm test  # When tests are added

# Backend tests
cd backend
npm run lint
npm test
npm run test:coverage
```

### 4. Commit Your Changes

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat(feature): description of changes"

# Push to remote
git push origin feature/pr-XX-description
```

### 5. Create Pull Request

- Use the PR template (`.github/pull_request_template.md`)
- Fill out all sections
- Link to related issues
- Request review from team members

### 6. Address Review Comments

- Make requested changes
- Push additional commits
- Re-request review when ready

### 7. Merge

- Ensure all checks pass
- Squash and merge when approved
- Delete branch after merge

## Code Style

### TypeScript/JavaScript

- Use TypeScript for all new code
- Enable strict mode
- Use meaningful variable names
- Add JSDoc comments for complex functions
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks

### React/Next.js

- Use functional components with hooks
- Keep components small and focused
- Use TypeScript for prop types
- Follow Next.js App Router conventions
- Use Server Components by default, Client Components when needed

### Styling

- Use Tailwind CSS utility classes
- Follow the design system (Gold/Teal/Purple)
- No arbitrary values - use design tokens
- Mobile-first responsive design
- Use oklch color space for custom colors

### File Organization

```
frontend/
  app/              # Pages using App Router
  components/       # Reusable components
    ui/            # Base UI components
    [feature]/     # Feature-specific components
  lib/             # Utilities and helpers
  src/
    api/           # API clients
    hooks/         # Custom hooks
    store/         # Redux store
    utils/         # Utility functions
```

## Testing Guidelines

### Unit Tests

- Test individual functions and components
- Mock external dependencies
- Aim for 80%+ coverage
- Use descriptive test names

```typescript
describe('TemplateService', () => {
  it('should parse variables from template content', () => {
    const template = 'Hello {{name}}'
    const variables = parseVariables(template)
    expect(variables).toEqual(['name'])
  })
})
```

### Integration Tests

- Test API endpoints end-to-end
- Use test database
- Clean up after each test

### E2E Tests

- Test critical user flows
- Use Playwright
- Run against staging environment

## Documentation

### Code Documentation

- Add JSDoc comments for public functions
- Explain complex algorithms
- Document API endpoints

### README Updates

- Update README.md when adding features
- Keep documentation in sync with code
- Add examples for new functionality

### API Documentation

- Document all endpoints in `/docs/API_REFERENCE.md`
- Include request/response examples
- Document error codes

## Security

### Best Practices

- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user inputs
- Sanitize data before database queries
- Follow OWASP guidelines

### Reporting Vulnerabilities

- Do not open public issues for security vulnerabilities
- Contact the team directly
- Provide detailed reproduction steps

## Performance

### Guidelines

- Keep API responses < 2 seconds
- Optimize database queries (< 500ms)
- Use caching where appropriate
- Lazy load large components
- Optimize images and assets

## Accessibility

- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers
- Maintain WCAG AA compliance

## PR Review Checklist

Before requesting review, ensure:

- [ ] Code follows style guidelines
- [ ] All tests pass locally
- [ ] New tests added for new functionality
- [ ] Documentation updated
- [ ] No console.log() or commented code
- [ ] TypeScript types are correct
- [ ] No linter errors
- [ ] Build succeeds
- [ ] Security best practices followed
- [ ] Performance impact considered

## Getting Help

- Read the [Engineering Roadmap](./docs/Initialdocs/ENGINEERING_ROADMAP.md)
- Check [Quick Reference](./docs/Initialdocs/QUICK_REFERENCE.md)
- Review [Scaffolding Guide](./docs/Initialdocs/SCAFFOLDING_GUIDE.md)
- Ask in team chat for clarification

---

**Remember**: Quality over speed. Write code that is maintainable, tested, and documented.

