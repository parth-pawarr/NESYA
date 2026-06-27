"""
Test narratives for FIR NLP extraction system.
Three realistic Indian FIR scenarios.
"""

NARRATIVES = {
    "chain_snatching": (
        "On 15th June 2024, at around 9 PM, I was walking near Laxmi Chowk, "
        "Pune when a person on a motorcycle approached me from behind. "
        "He snatched my gold chain and fled on his motorcycle. "
        "The accused is unknown to me. He was wearing a black helmet "
        "and a red shirt. The gold chain is worth approximately Rs. 45,000. "
        "A bystander, Ramesh Patil, witnessed the incident."
    ),

    "domestic_violence": (
        "I, Sunita Devi, am filing this complaint against my husband Rajesh Kumar "
        "and his mother Kamla Devi. On 10th July 2024 at 11 PM, my husband came "
        "home in a drunk state and assaulted me with an iron rod. "
        "He threatened to kill me if I reported the matter to police. "
        "He has been harassing and beating me for the past six months. "
        "I was taken to Civil Hospital, Nagpur for treatment. "
        "My neighbour Geeta Sharma witnessed the assault through the window."
    ),

    "online_fraud": (
        "On 22nd August 2024, I received a call from an unknown person who "
        "impersonated a KYC officer of my bank. He said my account would be "
        "blocked unless I share the OTP. I was deceived into sharing the OTP "
        "and immediately Rs. 1.5 lakh was transferred from my account via UPI. "
        "I have a screenshot of the transaction. The accused is unknown to me. "
        "I tried calling back but the number was switched off."
    ),

    "witness_named_phrase": (
        "On 12th September 2024, near a crowded market in Jaipur, a man "
        "attacked me with a knife. There was a witness named Amit Verma who "
        "saw the whole incident. He later gave his statement to the police."
    ),
}
