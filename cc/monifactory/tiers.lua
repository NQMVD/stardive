local arg = arg or {...}
local parser = require'/lib/argparse'()
  :name(arg[0])
  :description'Shows tier progression on monitors.'

parser:argument('monitor', 'the monitor to use')

local args = parser:parse(arg)

local name = args.monitor

local showButtons = false

-- libs ---------------------------------------------------------------

local tableStorage = require'/lib/tableStorage'
local butter = require'/lib/buttons'
local log = require'/lib/log'

local tiers = require'moniStuff'

local pretty = require'cc.pretty'.pretty
local pprint = require'cc.pretty'.pretty_print
local wrap = require'cc.strings'.wrap
local split = require'cc.strings'.split
-- local ensure_width = require'cc.strings'.ensure_width

-- ROM --------------------------------------------------------------

local machines = {"Wiremill", "Macerator", "Arc Furnace", "Extractor", "Electric Furnace", "Centrifuge", "Atomic Reconstructor"}
assert(#machines <= 7, "max of 7 machines per monitor!")

-- setup --------------------------------------------------------------

local monitor = peripheral.wrap(name)
monitor.setTextScale(1)
require'/lib/tierColors'(monitor)
local monitorWidth, monitorHeight = monitor.getSize()

local isLocked = true
local lockButtonId = butter.idCounter
local buttons = {}

local lockButtonClick = function(state)
    isLocked = not state
    buttons[lockButtonId].state = state
    if state then
        buttons[lockButtonId].label = '[UNLOCKED]'
    else
        buttons[lockButtonId].label = '[LOCKED]'
    end
end
table.insert(buttons, butter.idCounter, butter.createButton{
    x = 2,
    y = monitorHeight-2,
    width = 10,
    height = 1,
    label = "[LOCKED]",
    isToggle = true,
    onClick = lockButtonClick,
    monitor = monitor,
    colors = {bg=colors.black, fg=colors.red, bgOn=colors.black, fgOn=colors.lime},
    border = false
})

local machineStates = tableStorage.load('machineStates', #machines)
local function getCurrentHighestTier()
    local maxVal = 0
    for i,v in ipairs(machineStates) do
        if v > maxVal then
            maxVal = v
        end
    end
    return maxVal
end
local tierLimit = getCurrentHighestTier()

local dims = {
    grid = {
        start = {
            x = 2, y = 6
        },
        box = {
            w = 9.7, h = 6
        },
        limitColumn = {
            x = 0, padding = 3
        },
        spacing = 2
    }
}

dims.grid.columns = {
    { name = { x = 0 }, tiers = { x = 0 } },
    { name = { x = 10 }, tiers = { x = 10 } },
    { name = { x = 20 }, tiers = { x = 21 } },
    { name = { x = 30 }, tiers = { x = 32 } },
    { name = { x = 42 }, tiers = { x = 42 } },
    { name = { x = 53 }, tiers = { x = 53 } },
    { name = { x = 64 }, tiers = { x = 64 } },
}

for i,v in ipairs(dims.grid.columns) do
    v.name.y = 0
    v.tiers.y = 2
end

dims.grid.limitColumn.x = monitorWidth - dims.grid.box.w + dims.grid.limitColumn.padding


-- drawing functions --------------------------------------------------------------

local function getCenteredX(text, boxWidth)
    local textWidth = #text
    return math.floor((boxWidth - textWidth) / 2)
end

local function drawGrid()
    
    for i, machine in ipairs(machines) do
        local columnDims = dims.grid.columns[i]
        local x = dims.grid.start.x + columnDims.name.x
        local y = dims.grid.start.y + columnDims.name.y
        
        monitor.setBackgroundColor(colors.black)
        monitor.setTextColor(colors.white)
        
        local lines = split(machine, '%s+')
        local line1 = lines[1] or ''
        local line2 = lines[2] or ''
        
        local centerX1 = x + getCenteredX(line1, dims.grid.box.w)
        local centerX2 = x + getCenteredX(line2, dims.grid.box.w)
        
        monitor.setCursorPos(centerX1, y)
        monitor.write(line1)
        
        monitor.setCursorPos(centerX2, y + 1)
        monitor.write(line2)
        
        -- Draw tiers under each machine
        for j, tier in ipairs(tiers) do
            if j > tierLimit then break end
                        
            x = dims.grid.start.x + columnDims.tiers.x
            y = dims.grid.start.y + columnDims.tiers.y + j
            
            local tierText = (j == machineStates[i]) and (" >" .. tier[1]) or ("  " .. tier[1])
            local tierCenterX = x + getCenteredX(tierText, dims.grid.box.w)
            
            monitor.setCursorPos(x, y)
            
            monitor.setBackgroundColor(colors.black)
            if j <= machineStates[i] then
                monitor.setTextColor(tier[2])
            else
                monitor.setTextColor(colors.gray)
            end
            
            monitor.write(tierText)
            
            monitor.setBackgroundColor(colors.black)
            monitor.setTextColor(colors.white)
        end
    end

    -- Draw the Tier Limit column
    monitor.setCursorPos(dims.grid.limitColumn.x + getCenteredX("Limit", dims.grid.box.w)+1, dims.grid.start.y)
    monitor.setBackgroundColor(colors.black)
    monitor.setTextColor(colors.white)
    monitor.write("Limit")
    
    for j, tier in ipairs(tiers) do
        local y = dims.grid.start.y + dims.grid.spacing + j
        local tierText = (j == tierLimit) and ("  " .. tier[1]) or ("  " .. tier[1])
        local tierCenterX = dims.grid.limitColumn.x + getCenteredX(tierText, dims.grid.box.w)
        
        monitor.setCursorPos(tierCenterX, y)
        
        if j <= tierLimit then
            monitor.setTextColor(colors.lightGray)
        else
            monitor.setTextColor(colors.gray)
        end
        
        monitor.write(tierText)
    end
end

local function redraw()
    monitor.clear()
    drawGrid() -- Draw initial state
    butter.drawButtons(buttons)
end

-- update functions --------------------------------------------------------------

-- Detect if the Tier Limit column is clicked
local function getClickedTierLimit(x, y)
    if x >= dims.grid.limitColumn.x and x < dims.grid.limitColumn.x + dims.grid.box.w then
        for j, _ in ipairs(tiers) do
            local my = dims.grid.start.y + dims.grid.spacing + j
            if y == my then
                return math.max(getCurrentHighestTier(), j) -- Return the tier index clicked
            end
        end
    end
    return nil
end

-- Helper to find the clicked machine and tier
local function getClickedMachineAndTier(x, y)
    for i, machine in ipairs(machines) do
        local mx = dims.grid.start.x + (i - 1) * (dims.grid.box.w + 1)
        if x >= mx and x < mx + dims.grid.box.w then
            for j, _ in ipairs(tiers) do
                local my = dims.grid.start.y + dims.grid.spacing + j
                if y == my then
                    -- constrain tier to current tier limit
                    return i, math.min(tierLimit, j)
                end
            end
        end
    end
    return nil, nil
end

-- Main Program --------------------------------------------------------------
redraw()

while true do
    local event, side, x, y = os.pullEvent("monitor_touch")
    if side == peripheral.getName(monitor) then
        butter.handleEvent(buttons, side, x, y)
    end
    
    -- Check if the lock button was clicked
    if not isLocked then
        -- Check if a machine or tier was clicked
        local machineIndex, tierIndex = getClickedMachineAndTier(x, y)
        if machineIndex and tierIndex then
            machineStates[machineIndex] = tierIndex
            lockButtonClick(false)
        end
    end
    
    -- Check if the Tier Limit column was clicked
    local clickedTierLimit = getClickedTierLimit(x, y)
    if clickedTierLimit then
        tierLimit = clickedTierLimit
        lockButtonClick(false)
    end
    
    redraw()

    tableStorage.save('machineStates', machineStates)
end
