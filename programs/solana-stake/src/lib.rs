use anchor_lang::prelude::*;

declare_id!("4DSyXGut8W6SqDzyYgssesk5d7599didy65vqyvmprbP");

#[program]
pub mod solana_stake {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
