#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, Symbol, Vec,
};

#[derive(Clone)]
#[contracttype]
pub struct Auction {
    pub seller: Address,
    pub item: Symbol,
    pub highest_bid: i128,
    pub highest_bidder: Address,
    pub ended: bool,
}

#[contract]
pub struct AuctionContract;

#[contractimpl]
impl AuctionContract {

    // Initialize auction
    pub fn create_auction(env: Env, seller: Address, item: Symbol) {
        seller.require_auth();

        let auction = Auction {
            seller: seller.clone(),
            item,
            highest_bid: 0,
            highest_bidder: seller.clone(),
            ended: false,
        };

        env.storage().instance().set(&Symbol::short("AUCT"), &auction);
    }

    // Place a bid
    pub fn bid(env: Env, bidder: Address, amount: i128) {
        bidder.require_auth();

        let mut auction: Auction = env
            .storage()
            .instance()
            .get(&Symbol::short("AUCT"))
            .unwrap();

        if auction.ended {
            panic!("Auction already ended");
        }

        if amount <= auction.highest_bid {
            panic!("Bid too low");
        }

        auction.highest_bid = amount;
        auction.highest_bidder = bidder;

        env.storage().instance().set(&Symbol::short("AUCT"), &auction);
    }

    // End auction
    pub fn end_auction(env: Env, seller: Address) {
        seller.require_auth();

        let mut auction: Auction = env
            .storage()
            .instance()
            .get(&Symbol::short("AUCT"))
            .unwrap();

        if auction.seller != seller {
            panic!("Only seller can end auction");
        }

        auction.ended = true;

        env.storage().instance().set(&Symbol::short("AUCT"), &auction);
    }

    // Get auction details
    pub fn get_auction(env: Env) -> Auction {
        env.storage()
            .instance()
            .get(&Symbol::short("AUCT"))
            .unwrap()
    }
}