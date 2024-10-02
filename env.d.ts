
declare namespace NodeJS {
    interface ProcessEnv {
        PUBLIC_CLIENT_ID: string,
        CLIENT_SECRET: string,
        DISCORD_BOT_TOKEN:string,
        PORT: string,
        COLYSEUS: string
    }
}