module EnglishMajorC.Syntax
  ( Program (..)
  , Located (..)
  , SourceRange (..)
  , SourceItem (..)
  , Machine (..)
  , PhysicalRegister (..)
  , RegisterName (..)
  , InstructionName (..)
  , CommentKind (..)
  , Operation (..)
  , ControlFlowInstruction (..)
  , DataInstruction (..)
  ) where

import Data.Text (Text)
import Text.Megaparsec (SourcePos)

newtype Program = Program { programItems :: [Located SourceItem] }
  deriving (Eq, Show)

data Located item = Located
  { sourceRange :: SourceRange
  , originalSource :: Text
  , sourceItem :: item
  } deriving (Eq, Show)

-- End positions are exclusive. Offsets count Text characters, not bytes.
data SourceRange = SourceRange
  { startPosition :: SourcePos
  , endPosition :: SourcePos
  , startCharacterOffset :: Int
  , endCharacterOffset :: Int
  } deriving (Eq, Show)

data Machine = ARMv7AThumb deriving (Eq, Show)

newtype PhysicalRegister = PhysicalRegister Int deriving (Eq, Ord, Show)
newtype RegisterName = RegisterName Text deriving (Eq, Ord, Show)
newtype InstructionName = InstructionName Text deriving (Eq, Ord, Show)

data CommentKind = OrdinaryNote | Explanation deriving (Eq, Show)

data SourceItem
  = MachineDeclaration Machine
  | RegisterNameDeclaration PhysicalRegister RegisterName
  | FollowingInstructionName InstructionName
  | ExecutableOperation Operation
  | NonexecutingComment CommentKind Text
  deriving (Eq, Show)

data Operation
  = ChangesExecutionIndex ControlFlowInstruction
  | OperatesOnRegistersOrMemory DataInstruction
  deriving (Eq, Show)

data ControlFlowInstruction
  = ReplaceExecutionIndexIfZeroFlagIsOne InstructionName
  | ReplaceExecutionIndexUnconditionally InstructionName
  | ReplaceExecutionIndexWithLinkRegisterAddress
  deriving (Eq, Show)

-- These types distinguish machine operations, not a general numeric type system.
-- Operand order follows the source sentence (source first, destination second).
data DataInstruction
  = PutZeroWithoutChangingFlags RegisterName
  | Put65535IntoLowSixteenBitsAndZeroIntoHighBits RegisterName
  | Put65535IntoHighSixteenBitsKeepingLowBits RegisterName
  | CompareWithZeroAndUpdateFlags RegisterName
  | CompareRegistersAndUpdateFlags RegisterName RegisterName
  | LoadFourBytesFromAddressIntoRegister RegisterName RegisterName
  | IncreaseByFourWithoutChangingFlags RegisterName
  | DecreaseByOneWithoutChangingFlags RegisterName
  | AddKeepingLowThirtyTwoBitsWithoutChangingFlags RegisterName RegisterName
  | CopyWithoutChangingFlags RegisterName RegisterName
  deriving (Eq, Show)
