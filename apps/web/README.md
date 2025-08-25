# MintMoment Web

This app powers the event streaming experience.

Environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- OPENAI_API_KEY
- FACEBOOK_CLIENT_ID
- FACEBOOK_CLIENT_SECRET
- TWITTER_CLIENT_ID
- TWITTER_CLIENT_SECRET
- INSTAGRAM_CLIENT_ID
- INSTAGRAM_CLIENT_SECRET
- NEXTAUTH_URL
- NEXTAUTH_SECRET
- APP_URL
- STREAM_RECONNECT_GRACE_MS
- NEXT_PUBLIC_AI_FRAME_FPS

New env flags:
- STREAM_RECONNECT_GRACE_MS: grace period in ms to keep a stream alive after a transient disconnect (default 10000)
- NEXT_PUBLIC_AI_FRAME_FPS: AI frame capture rate (0 disables; recommended 1-2 for testing)

Local development:
- bun install
- bun run dev or your preferred dev command for running the custom server

Manual testing guidance:
- Stream under throttled network (e.g., Slow 3G) to validate chunk queueing and reconnect flush
- Join as a spectator mid-stream and after streamer reconnects
- Set NEXT_PUBLIC_AI_FRAME_FPS=1 to validate frame capture without impacting playback
- Validate social logins and confirm provider tokens are available under session.social.{provider}

# MintMoments - Web

### Workspace Folder Structure

The webapp is organized as follows:

Here's the structure of your web application:

```bash
.
├── /app
│   ├── /(auth-pages) # Authentication-related pages
│   │   └── sign-in
│   │       └── otp
│   ├── /auth
│   │   └── confirm
│   │       └── user
│   ├── /css # Stylesheets
│   ├── /events
│   │   └── [slug]
│   │       └── @modal
│   │           └── (...)(auth-pages)
│   │               └── sign-in
│   ├── /api
│   │   └── chat
│   ├── /profile
│   │   └── [username]
│   └── /error
├── /components
│   ├── /pages # Page main sections components
│   │   └── sign-in
│   │       └── otp
│   ├── /ui # UI components coming from shadcn/ui
│   ├── /icons # SVG custom icons outside Lucide Icons
│   └── /shared
├── /lib
│   ├── /constants
│   ├── /hooks
│   ├── /supabase
│   └── utils.ts # Utility functions
├── /server # Socket.io server
├── /services # Supabase + Other services
├── /types
├── components.json
├── middleware.ts
├── next.config.js
├── next-env.d.ts
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.server.json
└── tsconfig.tsbuildinfo
```

### How to Run Locally

1. **Clone the repository**:

   ```sh
   git clone https://github.com/andlerrl/MintMoments.git mint-moments
   cd mint-moments
   ```

2. **Install dependencies**:

   ```sh
   bun install
   ```

3. **Set up environment variables**:

   - Copy [`.env.example`](/.env.example) to [`.env`](./.env) and populate it with your environment-specific values.

4. **Run the development server**:

   ```sh
   bun run dev
   ```

5. **Build the project**:

   ```sh
   bun run build
   ```

6. **Start the production server**:

   ```sh
   bun start
   ```

### Dependencies

The project uses the following dependencies:

- **tailwindcss**: CSS theme and styling [Documentation](https://tailwindcss.com/docs)
- **clsx**: `cn()` utility function for conditional className clauses [Documentation](https://github.com/lukeed/clsx)
- **cva**: Class Variant Authority for classNames [Documentation](https://cva.style/docs)
- **framer-motion**: Smooth animations [Documentation](https://www.framer.com/api/motion/)
- **shadcn/ui**: Set of re-usable components [Documentation](https://shadcn.com/docs)
- **@supabase/ssr**: Supabse for database fetching and subscription [Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)
- **socket.io**: Real-time communication [Documentation](https://socket.io/docs/v4)

For a complete list of dependencies, refer to the [`package.json`](./apps/web/package.json") file.
