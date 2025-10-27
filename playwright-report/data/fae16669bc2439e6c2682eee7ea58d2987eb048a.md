# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - img [ref=e6]
    - heading "404" [level=1] [ref=e11]
    - heading "Page Not Found" [level=2] [ref=e12]
    - paragraph [ref=e13]:
      - text: The page you're looking for doesn't exist or has been moved.
      - generic [ref=e14]:
        - text: You'll be redirected to the discover page in
        - generic [ref=e15]: "5"
        - text: seconds.
    - generic [ref=e16]:
      - button "Go to Discover" [ref=e17] [cursor=pointer]:
        - img [ref=e18]
        - text: Go to Discover
      - button "Go Back" [ref=e21] [cursor=pointer]:
        - img [ref=e22]
        - text: Go Back
    - generic [ref=e24]:
      - paragraph [ref=e25]: Looking for something specific?
      - generic [ref=e26]:
        - link "→ Browse Communities" [ref=e27] [cursor=pointer]:
          - /url: /discover
        - link "→ Contact Support" [ref=e28] [cursor=pointer]:
          - /url: mailto:support@referral-flywheel.com
  - alert [ref=e29]
```