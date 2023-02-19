<script>

    import rand from './../../utils/functions/randoms'

    let valueRandNumBetween_start = null;
    let valueRandNumBetween_end = null;
    let resultRandNumBetween = null
    
    function onRandNumBetween() {
        if (!valueRandNumBetween_start || !valueRandNumBetween_end) return

        valueRandNumBetween_start = parseInt(valueRandNumBetween_start)
        valueRandNumBetween_end = parseInt(valueRandNumBetween_end)

        resultRandNumBetween = rand.randomNumberBetween(
            valueRandNumBetween_start, 
            valueRandNumBetween_end
        )
    }
    
</script>


<div class="card-service">
    <div class="title-service">
        <p>Random Number Between</p>
    </div>
    <div class="body-service">
        <input 
            type="number" 
            bind:value={valueRandNumBetween_start} 
            placeholder="Start"
        />
        <input style="margin-top: 0.6rem" 
            type="number" 
            bind:value={valueRandNumBetween_end}
            placeholder="End"
        />
    </div>
    <div class="action-service">
        <button class="decorative-button" on:click={onRandNumBetween}>
            Random
        </button>
        <div class="result-service">
            <p>Result: &nbsp;{resultRandNumBetween || '-'}</p>
        </div>
    </div>

    
</div>