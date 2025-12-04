use anchor_lang::prelude::*;
use anchor_lang::system_program;
declare_id!("4DSyXGut8W6SqDzyYgssesk5d7599didy65vqyvmprbP");

const POINTS_PER_SOL_PER_DAY: u64 = 1_000_000; // Using micro-points for precision
const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
const SECONDS_PER_DAY: u64 = 86_400;

pub mod solana_stake {
    use anchor_lang::solana_program::clock;

    use super::*;

    pub fn create_pda(ctx: Context<CreatePda>) -> Result<()> {
     let pda_account = &mut ctx.accounts.pda_account;
     let clock = Clock::get()?;


     pda_account.bump = ctx.bumps.pda_account;
     pda_account.owner = ctx.accounts.payer.key();
     pda_account.last_updated_time = clock.unix_timestamp;
     pda_account.staked_amount = 0;
     pda_account.total_points = 0;

     Ok(())
    }
    
    pub fn stake(ctx: Context<StakeOperationMut>, amount : u64)-> Result<()>{
        require!(amount > 0, StakeError::InvalidAmount);

        let pda_account = &mut ctx.accounts.pda_account;
        let clock = Clock::get()?;

        update_points(pda_account, clock.unix_timestamp)?;

        let cpi_context = CpiContext::new(ctx.accounts.system_program.to_account_info(),
         system_program::Transfer{
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.pda_account.to_account_info(),
         }
         );
         system_program::transfer(cpi_context, amount)?;
         
     Ok(())
    }

}
fn update_points(pda_account: &mut StakeAccount, current_time:i64)-> Result<()>{

let time_elapsed = current_time.checked_sub(pda_account.last_updated_time).ok_or(StakeError::InvalidTimestamp)? as u64;

if time_elapsed > 0 && pda_account.staked_amount > 0{
    let new_points = calculate_points(pda_account.staked_amount, time_elapsed)?;

    pda_account.total_points = pda_account.total_points.checked_add(new_points)
    .ok_or(StakeError::Overflow)?;
}
Ok(())
}

fn calculate_points(staked_amount: u64 , time_elapsed_seconds : u64)-> Result<u64>{

let points = (staked_amount as u128)
.checked_mul(time_elapsed_seconds as u128)
.ok_or(StakeError::Overflow)?
.checked_mul(POINTS_PER_SOL_PER_DAY as u128)
.ok_or(StakeError::Overflow)?
.checked_mul(LAMPORTS_PER_SOL as u128)
.ok_or(StakeError::Overflow)?
.checked_mul(SECONDS_PER_DAY as u128)
.ok_or(StakeError::Overflow)?;

Ok(points as u64)
}


#[derive(Accounts)]
pub struct CreatePda<'info>{
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"client1",payer.key().as_ref()],
        bump
    )]
    pub pda_account:Account<'info, StakeAccount>,
    pub system_program: Program<'info, System>
}
#[derive(Accounts)]
//Using genralised mut struct for all stake operations like stake sol, unstake sol, claim points, get points
pub struct StakeOperationMut<'info>{
    #[account(mut)]
    pub user : Signer<'info>,
    #[account(
        mut,
        seeds = [b"client1", user.key().as_ref()],
        bump = pda_account.bump,
        constraint = pda_account.owner == user.key() @StakeError::Unauthorized
    )]
    pub pda_account:Account<'info,StakeAccount>,
    pub system_program: Program<'info, System>
}
#[derive(Accounts)]
//Using genralised struct for all stake operations like stake sol, unstake sol, claim points, get points
pub struct StakeOperation<'info>{
    pub user : Signer<'info>,
    #[account(
        mut,
        seeds = [b"client1", user.key().as_ref()],
        bump = pda_account.bump,
        constraint = pda_account.owner == user.key() @StakeError::Unauthorized
    )]
    pub pda_account:Account<'info,StakeAccount>,
    pub system_program: Program<'info, System>
}

#[account]
pub struct StakeAccount{
    pub owner : Pubkey, //32 bytes
    pub staked_amount : u64, // 8 bytes
    pub total_points : u64,  //8 bytes
    pub last_updated_time: i64, // 8 bytes
    pub bump : u8  // 1 byte
}



#[error_code]
pub enum StakeError {
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    #[msg("Insufficient staked amount")]
    InsufficientStake,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Arithmetic underflow")]
    Underflow,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
}
