{-# LANGUAGE OverloadedStrings #-}

module EnglishMajorC.Validation (ValidationError (..), validateProgram) where

import Control.Monad (foldM, unless, when)
import qualified Data.Map.Strict as Map
import qualified Data.Set as Set
import Data.Text (Text)
import EnglishMajorC.Syntax

data ValidationError = ValidationError
  { validationLocation :: Maybe SourceRange
  , validationMessage :: Text
  } deriving (Eq, Show)

data Collected = Collected
  { machineWasDeclared :: Bool
  , declarationsAreOver :: Bool
  , namedRegisters :: Map.Map RegisterName PhysicalRegister
  , declaredPhysicalRegisters :: Set.Set PhysicalRegister
  , namedInstructions :: Map.Map InstructionName SourceRange
  , branchReferences :: [(InstructionName, SourceRange)]
  , pendingInstructionNames :: [SourceRange]
  , instructionCount :: Int
  }

emptyCollected :: Collected
emptyCollected = Collected False False Map.empty Set.empty Map.empty [] [] 0

validateProgram :: Program -> Either ValidationError ()
validateProgram (Program items) = do
  collected <- foldM collect emptyCollected items
  unless (machineWasDeclared collected)
    (Left (ValidationError Nothing "Declare the machine before naming registers or instructions."))
  when (instructionCount collected == 0)
    (Left (ValidationError Nothing "At least one executable operation is required."))
  case pendingInstructionNames collected of
    location : _ -> reject location "An instruction name must be followed by an executable operation."
    [] -> pure ()
  mapM_ (checkBranch collected) (branchReferences collected)

reject :: SourceRange -> Text -> Either ValidationError value
reject location message = Left (ValidationError (Just location) message)

requireMachine :: Collected -> SourceRange -> Either ValidationError ()
requireMachine collected location = unless (machineWasDeclared collected)
  (reject location "Declare the machine before naming registers or instructions.")

collect :: Collected -> Located SourceItem -> Either ValidationError Collected
collect collected located = case sourceItem located of
  NonexecutingComment _ _ -> pure collected
  MachineDeclaration _ -> do
    when (machineWasDeclared collected)
      (reject location "The machine must be declared exactly once.")
    pure collected { machineWasDeclared = True }
  RegisterNameDeclaration register name -> do
    requireMachine collected location
    when (declarationsAreOver collected)
      (reject location "Name registers before the first instruction label or operation.")
    when (Map.member name (namedRegisters collected))
      (reject location "This descriptive register name has already been declared.")
    when (Set.member register (declaredPhysicalRegisters collected))
      (reject location "This physical register has already been given a name.")
    pure collected
      { namedRegisters = Map.insert name register (namedRegisters collected)
      , declaredPhysicalRegisters = Set.insert register (declaredPhysicalRegisters collected)
      }
  FollowingInstructionName name -> do
    requireMachine collected location
    when (Map.member name (namedInstructions collected))
      (reject location "This instruction name has already been declared.")
    pure collected
      { declarationsAreOver = True
      , namedInstructions = Map.insert name location (namedInstructions collected)
      , pendingInstructionNames = location : pendingInstructionNames collected
      }
  ExecutableOperation operation -> do
    requireMachine collected location
    mapM_ (requireRegister collected location) (registerOperands operation)
    let references = [(name, location) | name <- instructionOperands operation]
    pure collected
      { declarationsAreOver = True
      , branchReferences = branchReferences collected ++ references
      , pendingInstructionNames = []
      , instructionCount = instructionCount collected + 1
      }
  where
    location = sourceRange located

requireRegister :: Collected -> SourceRange -> RegisterName -> Either ValidationError ()
requireRegister collected location (RegisterName name) =
  unless (Map.member (RegisterName name) (namedRegisters collected))
    (reject location ("No machine register has been given the name \"" <> name <> "\"."))

checkBranch :: Collected -> (InstructionName, SourceRange) -> Either ValidationError ()
checkBranch collected (InstructionName name, location) =
  unless (Map.member (InstructionName name) (namedInstructions collected))
    (reject location ("No instruction has been given the name \"" <> name <> "\"."))

registerOperands :: Operation -> [RegisterName]
registerOperands (ChangesExecutionIndex _) = []
registerOperands (OperatesOnRegistersOrMemory operation) = case operation of
  PutZeroWithoutChangingFlags destination -> [destination]
  Put65535IntoLowSixteenBitsAndZeroIntoHighBits destination -> [destination]
  Put65535IntoHighSixteenBitsKeepingLowBits destination -> [destination]
  CompareWithZeroAndUpdateFlags register -> [register]
  CompareRegistersAndUpdateFlags left right -> [left, right]
  LoadFourBytesFromAddressIntoRegister address destination -> [address, destination]
  IncreaseByFourWithoutChangingFlags register -> [register]
  DecreaseByOneWithoutChangingFlags register -> [register]
  AddKeepingLowThirtyTwoBitsWithoutChangingFlags source destination -> [source, destination]
  CopyWithoutChangingFlags source destination -> [source, destination]

instructionOperands :: Operation -> [InstructionName]
instructionOperands (OperatesOnRegistersOrMemory _) = []
instructionOperands (ChangesExecutionIndex operation) = case operation of
  ReplaceExecutionIndexIfZeroFlagIsOne destination -> [destination]
  ReplaceExecutionIndexUnconditionally destination -> [destination]
  ReplaceExecutionIndexWithLinkRegisterAddress -> []
