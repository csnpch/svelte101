<script>
    
    import Swal from "sweetalert2";
    import "sweetalert2/dist/sweetalert2.min.css";
    import rand from './../../utils/functions/randoms'

    let valueRandStringLength = null;
    let resultRandString = null; 

    function onRandomStringLength() {
        if (!valueRandStringLength) return

        valueRandStringLength = parseInt(valueRandStringLength)
        resultRandString = rand.randomStringLength(valueRandStringLength)
        copyText(resultRandString)
    }
    // Copy Text to clipboard
    function copyText(str) {
        navigator.clipboard.writeText(str);
    
        Swal.fire({
            icon: 'success',
            title: 'Copy to clipboard',
            showConfirmButton: false,
            timer: 800
        })
    }

</script>


<div class="card-service">
    <div class="title-service">
        <p>Random String Length</p>
    </div>
    <div class="body-service">
        <input 
            type="number"
            bind:value={valueRandStringLength}
            placeholder="length" 
        />
    </div>
    <div class="action-service">
        <button class="decorative-button " on:click={onRandomStringLength}>
            Random
        </button>
    </div>
    <div class="result-service">
        <p id="resultRandomText">Result: {resultRandString || '-'}</p>
    </div>
</div>
