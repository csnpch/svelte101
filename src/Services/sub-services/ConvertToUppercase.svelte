<script>

    import convert from '../../utils/functions/converts'

    let valueStrToUpcase = null
    let resultStrToUpcase = null

    function onConvertStrToUpcase() {
        if (!valueStrToUpcase) return
        resultStrToUpcase = convert.convertToUppercase(valueStrToUpcase)
    }
    
</script>


<div class="card-service">
    <div class="title-service">
        <p>Convert String to Uppercase</p>
    </div>
    <div class="body-service">
        <input 
            type="text"
            bind:value={valueStrToUpcase}
            placeholder="text" 
        />
    </div>
    <div class="action-service">
        <button class="decorative-button" on:click={onConvertStrToUpcase}>Random</button>
    </div>
    <div class="result-service">
        <p>Result: &nbsp;{resultStrToUpcase|| '-'}</p>
    </div>
</div>