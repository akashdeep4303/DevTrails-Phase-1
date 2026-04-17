"""Shared types for VIGIL platform."""

from enum import Enum
from typing import Optional


class PayoutTier(str, Enum):
    INSTANT = "instant"           # Trust 70-100
    PROVISIONAL = "provisional"   # Trust 40-69, 50% now
    ESCROW = "escrow"             # Trust 0-39, hold for review


class ClaimStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PROVISIONAL = "provisional"
    ESCROW_HOLD = "escrow_hold"
    REJECTED = "rejected"


class SignalLayer(str, Enum):
    IMU = "imu"
    NETWORK = "network"
    DEVICE = "device"
    PLATFORM = "platform"
    SYNDICATE = "syndicate"
