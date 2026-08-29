"""
Secure Memory & Encryption Module

Handles transient decryption of private keys using PyNaCl (libsodium).
Implements Argon2id key derivation and XSalsa20-Poly1305 encryption.
"""

import json
import os
import gc
from typing import Optional, Tuple, List, Dict

import nacl.secret
import nacl.utils
import nacl.pwhash
from solders.keypair import Keypair

# Argon2id parameters for new containers, matching the Rust signer
# (secure_signer/src/crypto.rs: 64 MB memory, 3 iterations)
ARGON2ID_OPSLIMIT = 3
ARGON2ID_MEMLIMIT = 64 * 1024 * 1024  # 64 MB

class SecureWalletHandler:
    """
    Handles encrypted wallet operations.
    Ensures private keys are only decrypted transiently.
    """
    
    @staticmethod
    def encrypt_keypair(keypair: Keypair, password: str) -> dict:
        """
        Encrypts a keypair with a password.
        Returns a dictionary containing salt, nonce, and ciphertext.
        """
        password_bytes = password.encode('utf-8')
        salt = nacl.utils.random(nacl.pwhash.argon2id.SALTBYTES)
        
        # Derive key using Argon2id (resistant to GPU and side-channel attacks)
        key = nacl.pwhash.argon2id.kdf(
            nacl.secret.SecretBox.KEY_SIZE,
            password_bytes,
            salt,
            opslimit=ARGON2ID_OPSLIMIT,
            memlimit=ARGON2ID_MEMLIMIT
        )
        
        box = nacl.secret.SecretBox(key)
        nonce = nacl.utils.random(nacl.secret.SecretBox.NONCE_SIZE)
        
        # Serialize keypair to bytes
        secret_bytes = bytes(keypair)
        
        encrypted = box.encrypt(secret_bytes, nonce)
        
        # Clean up sensitive data
        del key
        del password_bytes
        gc.collect()
        
        # Return hex-encoded values for JSON storage
        return {
            "version": 2,
            "algo": "argon2id_xsalsa20poly1305",
            "opslimit": ARGON2ID_OPSLIMIT,
            "memlimit": ARGON2ID_MEMLIMIT,
            "salt": salt.hex(),
            "nonce": nonce.hex(),
            "ciphertext": encrypted.ciphertext.hex()
        }

    @staticmethod
    def _derive_key(encrypted_data: dict, password_bytes: bytes, salt: bytes) -> bytes:
        """
        Derives the symmetric key using the KDF recorded in the container.
        Containers without an "algo" field (or tagged "argon2i_...") predate
        the Argon2id upgrade and use the legacy Argon2i interactive parameters.
        """
        algo = encrypted_data.get('algo', 'argon2i_xsalsa20poly1305')
        if algo.startswith('argon2id'):
            return nacl.pwhash.argon2id.kdf(
                nacl.secret.SecretBox.KEY_SIZE,
                password_bytes,
                salt,
                opslimit=encrypted_data.get('opslimit', ARGON2ID_OPSLIMIT),
                memlimit=encrypted_data.get('memlimit', ARGON2ID_MEMLIMIT)
            )
        return nacl.pwhash.argon2i.kdf(
            nacl.secret.SecretBox.KEY_SIZE,
            password_bytes,
            salt,
            opslimit=nacl.pwhash.argon2i.OPSLIMIT_INTERACTIVE,
            memlimit=nacl.pwhash.argon2i.MEMLIMIT_INTERACTIVE
        )

    @staticmethod
    def decrypt_keypair(encrypted_data: dict, password: str) -> Optional[Keypair]:
        """
        Decrypts the keypair transiently.
        """
        try:
            password_bytes = password.encode('utf-8')
            salt = bytes.fromhex(encrypted_data['salt'])
            nonce = bytes.fromhex(encrypted_data['nonce'])
            ciphertext = bytes.fromhex(encrypted_data['ciphertext'])
            
            key = SecureWalletHandler._derive_key(encrypted_data, password_bytes, salt)
            
            box = nacl.secret.SecretBox(key)
            decrypted_bytes = box.decrypt(ciphertext, nonce)
            
            keypair = Keypair.from_bytes(decrypted_bytes)
            
            # Clean up sensitive data
            del key
            del password_bytes
            del decrypted_bytes
            gc.collect()
            
            return keypair
            
        except Exception as e:
            # print_warning(f"Decryption failed: {e}")
            return None
